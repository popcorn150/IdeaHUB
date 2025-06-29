import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    )

    console.log('Webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const planType = session.metadata?.plan_type

        console.log('Checkout completed for user:', userId, 'plan:', planType)

        if (!userId) {
          console.error('No user_id in session metadata')
          break
        }

        // Handle one-time payment (lifetime)
        if (session.mode === 'payment') {
          console.log('Processing lifetime payment for user:', userId)
          
          // Insert order record
          const { error: orderError } = await supabase
            .from('stripe_orders')
            .insert({
              checkout_session_id: session.id,
              payment_intent_id: session.payment_intent as string,
              customer_id: session.customer as string,
              amount_subtotal: session.amount_subtotal || 0,
              amount_total: session.amount_total || 0,
              currency: session.currency || 'usd',
              payment_status: session.payment_status || 'unpaid',
              status: 'completed'
            })

          if (orderError) {
            console.error('Error inserting order:', orderError)
          }

          // Update user to premium
          const { error: userError } = await supabase
            .from('users')
            .update({ is_premium: true })
            .eq('id', userId)

          if (userError) {
            console.error('Error updating user premium status:', userError)
          } else {
            console.log('Successfully updated user to premium:', userId)
          }
        }
        
        // Handle subscription payment
        if (session.mode === 'subscription' && session.subscription) {
          console.log('Processing subscription payment for user:', userId)
          
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          
          // Update subscription in database
          const { error: subError } = await supabase
            .from('stripe_subscriptions')
            .upsert({
              customer_id: session.customer as string,
              subscription_id: subscription.id,
              price_id: subscription.items.data[0]?.price.id,
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end,
              cancel_at_period_end: subscription.cancel_at_period_end,
              status: subscription.status as any,
            })

          if (subError) {
            console.error('Error updating subscription:', subError)
          }

          // Update user premium status
          const isPremium = ['active', 'trialing'].includes(subscription.status)
          const { error: userError } = await supabase
            .from('users')
            .update({ is_premium: isPremium })
            .eq('id', userId)

          if (userError) {
            console.error('Error updating user premium status:', userError)
          } else {
            console.log('Successfully updated user premium status:', userId, isPremium)
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('Subscription event for customer:', customerId, 'status:', subscription.status)

        // Get user from customer
        const { data: customer } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .single()

        if (!customer) {
          console.error('Customer not found:', customerId)
          break
        }

        // Update subscription in database
        const { error: subError } = await supabase
          .from('stripe_subscriptions')
          .upsert({
            customer_id: customerId,
            subscription_id: subscription.id,
            price_id: subscription.items.data[0]?.price.id,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            status: subscription.status as any,
          })

        if (subError) {
          console.error('Error updating subscription:', subError)
        }

        // Update user premium status
        const isPremium = ['active', 'trialing'].includes(subscription.status)
        const { error: userError } = await supabase
          .from('users')
          .update({ is_premium: isPremium })
          .eq('id', customer.user_id)

        if (userError) {
          console.error('Error updating user premium status:', userError)
        } else {
          console.log('Successfully updated user premium status:', customer.user_id, isPremium)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('Subscription deleted for customer:', customerId)

        // Get user from customer
        const { data: customer } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .single()

        if (customer) {
          // Remove premium status
          const { error: userError } = await supabase
            .from('users')
            .update({ is_premium: false })
            .eq('id', customer.user_id)

          if (userError) {
            console.error('Error removing premium status:', userError)
          }

          // Update subscription status
          const { error: subError } = await supabase
            .from('stripe_subscriptions')
            .update({ status: 'canceled' })
            .eq('customer_id', customerId)

          if (subError) {
            console.error('Error updating subscription status:', subError)
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          console.log('Invoice payment succeeded for subscription:', invoice.subscription)
          
          // Handle recurring payment success
          const customerId = invoice.customer as string
          
          const { data: customer } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('customer_id', customerId)
            .single()

          if (customer) {
            const { error: userError } = await supabase
              .from('users')
              .update({ is_premium: true })
              .eq('id', customer.user_id)

            if (userError) {
              console.error('Error updating premium status on payment success:', userError)
            } else {
              console.log('Updated premium status on payment success:', customer.user_id)
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          console.log('Invoice payment failed for subscription:', invoice.subscription)
          
          // Handle payment failure
          const customerId = invoice.customer as string
          
          const { data: customer } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('customer_id', customerId)
            .single()

          if (customer) {
            // Don't immediately remove premium, give them a grace period
            console.log('Payment failed for user:', customer.user_id)
          }
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(`Webhook error: ${error.message}`, { 
      headers: corsHeaders,
      status: 400 
    })
  }
})