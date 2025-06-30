import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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
  
  console.log('Webhook received:', {
    hasSignature: !!signature,
    bodyLength: body.length,
    headers: Object.fromEntries(req.headers.entries())
  })
  
  if (!signature) {
    console.error('No stripe-signature header found')
    return new Response('No signature', { 
      status: 400,
      headers: corsHeaders 
    })
  }

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return new Response('Webhook secret not configured', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    console.log('Webhook event verified:', {
      type: event.type,
      id: event.id,
      created: event.created
    })

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const planType = session.metadata?.plan_type
        const ideaId = session.metadata?.idea_id
        const creatorId = session.metadata?.creator_id
        const investorId = session.metadata?.investor_id

        console.log('Processing checkout.session.completed:', {
          sessionId: session.id,
          userId,
          planType,
          ideaId,
          creatorId,
          investorId,
          mode: session.mode,
          paymentStatus: session.payment_status,
          type: session.metadata?.type
        })

        // Handle idea purchase
        if (session.metadata?.type === 'idea_purchase' && ideaId && creatorId && investorId) {
          console.log('Processing idea purchase:', {
            ideaId,
            creatorId,
            investorId,
            paymentStatus: session.payment_status
          })

          if (session.payment_status === 'paid') {
            // Transfer ownership of the idea
            const { error: ideaError } = await supabase
              .from('ideas')
              .update({
                is_nft: true,
                minted_by: investorId
              })
              .eq('id', ideaId)

            if (ideaError) {
              console.error('Error transferring idea ownership:', ideaError)
            } else {
              console.log('✅ Idea ownership transferred successfully')
            }

            // Record the purchase transaction
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
              console.error('Error recording purchase order:', orderError)
            } else {
              console.log('✅ Purchase order recorded successfully')
            }
          }
          break
        }

        // Handle subscription payments (existing logic)
        if (!userId) {
          console.error('No user_id in session metadata')
          break
        }

        // Always update user to premium on successful checkout
        if (session.payment_status === 'paid') {
          console.log('Payment confirmed, updating user to premium:', userId)
          
          const { error: userError } = await supabase
            .from('users')
            .update({ is_premium: true })
            .eq('id', userId)

          if (userError) {
            console.error('Error updating user premium status:', userError)
          } else {
            console.log('✅ Successfully updated user to premium:', userId)
          }

          // Handle one-time payment (lifetime)
          if (session.mode === 'payment' && !session.metadata?.type) {
            console.log('Recording lifetime payment order')
            
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
            } else {
              console.log('✅ Order recorded successfully')
            }
          }
          
          // Handle subscription payment
          if (session.mode === 'subscription' && session.subscription) {
            console.log('Recording subscription')
            
            try {
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
              } else {
                console.log('✅ Subscription recorded successfully')
              }
            } catch (subRetrieveError) {
              console.error('Error retrieving subscription:', subRetrieveError)
            }
          }
        } else {
          console.log('Payment not yet confirmed, status:', session.payment_status)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const userId = account.metadata?.supabase_user_id

        console.log('Processing account.updated:', {
          accountId: account.id,
          userId,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled
        })

        if (userId) {
          // Update payout account status
          const accountEnabled = account.charges_enabled && account.payouts_enabled
          
          const { error } = await supabase
            .from('stripe_payout_accounts')
            .update({
              account_enabled: accountEnabled,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)

          if (error) {
            console.error('Error updating payout account status:', error)
          } else {
            console.log('✅ Payout account status updated:', accountEnabled)
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const ideaId = paymentIntent.metadata?.idea_id
        const creatorId = paymentIntent.metadata?.creator_id
        const investorId = paymentIntent.metadata?.investor_id

        console.log('Processing payment_intent.succeeded:', {
          paymentIntentId: paymentIntent.id,
          ideaId,
          creatorId,
          investorId,
          amount: paymentIntent.amount,
          applicationFeeAmount: paymentIntent.application_fee_amount
        })

        if (ideaId && creatorId && investorId) {
          console.log('✅ Idea purchase payment completed successfully')
          
          // The ownership transfer is already handled in checkout.session.completed
          // This is just for logging/confirmation
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('Processing subscription event:', {
          type: event.type,
          subscriptionId: subscription.id,
          customerId,
          status: subscription.status
        })

        // Get user from customer
        const { data: customer, error: customerError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .single()

        if (customerError || !customer) {
          console.error('Customer not found:', customerId, customerError)
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
        console.log('Updating user premium status:', customer.user_id, 'to', isPremium)
        
        const { error: userError } = await supabase
          .from('users')
          .update({ is_premium: isPremium })
          .eq('id', customer.user_id)

        if (userError) {
          console.error('Error updating user premium status:', userError)
        } else {
          console.log('✅ Successfully updated user premium status:', customer.user_id, isPremium)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('Processing subscription deletion:', {
          subscriptionId: subscription.id,
          customerId
        })

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
          } else {
            console.log('✅ Removed premium status for user:', customer.user_id)
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
        
        console.log('Processing invoice payment success:', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription
        })
        
        if (invoice.subscription) {
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
              console.log('✅ Updated premium status on payment success:', customer.user_id)
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        console.log('Processing invoice payment failure:', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription
        })
        
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
            console.log('⚠️ Payment failed for user:', customer.user_id)
          }
        }
        break
      }

      default:
        console.log('Unhandled webhook event type:', event.type)
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