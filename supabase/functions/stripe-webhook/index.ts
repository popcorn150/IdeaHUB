import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
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

        if (!userId) {
          console.error('No user_id in session metadata')
          break
        }

        // Handle one-time payment (lifetime)
        if (session.mode === 'payment') {
          await supabase
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

          // Update user to premium
          await supabase
            .from('users')
            .update({ is_premium: true })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

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
        await supabase
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

        // Update user premium status
        const isPremium = ['active', 'trialing'].includes(subscription.status)
        await supabase
          .from('users')
          .update({ is_premium: isPremium })
          .eq('id', customer.user_id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get user from customer
        const { data: customer } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .single()

        if (customer) {
          // Remove premium status
          await supabase
            .from('users')
            .update({ is_premium: false })
            .eq('id', customer.user_id)

          // Update subscription status
          await supabase
            .from('stripe_subscriptions')
            .update({ status: 'canceled' })
            .eq('customer_id', customerId)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          // Handle recurring payment success
          const customerId = invoice.customer as string
          
          const { data: customer } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('customer_id', customerId)
            .single()

          if (customer) {
            await supabase
              .from('users')
              .update({ is_premium: true })
              .eq('id', customer.user_id)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
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
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(`Webhook error: ${error.message}`, { status: 400 })
  }
})