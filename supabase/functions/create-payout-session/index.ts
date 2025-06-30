import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { ideaId, investorId, amount = 5000 } = await req.json() // Default $50.00

    if (!ideaId || !investorId) {
      throw new Error('Missing required parameters: ideaId and investorId')
    }

    // Get idea details and creator info
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select(`
        *,
        author:users!ideas_created_by_fkey(*)
      `)
      .eq('id', ideaId)
      .single()

    if (ideaError || !idea) {
      throw new Error('Idea not found')
    }

    // Verify idea is for sale and not already sold
    if (idea.ownership_mode !== 'forsale' || idea.minted_by) {
      throw new Error('Idea is not available for purchase')
    }

    // Get or create Stripe customer for investor
    let { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', investorId)
      .single()

    let customerId = existingCustomer?.customer_id

    if (!customerId) {
      // Get investor email
      const { data: { user } } = await supabase.auth.admin.getUserById(investorId)
      
      if (!user?.email) {
        throw new Error('Investor email not found')
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: investorId,
        },
      })

      customerId = customer.id

      // Save customer to database
      await supabase
        .from('stripe_customers')
        .insert({
          user_id: investorId,
          customer_id: customerId,
        })
    }

    // Check if creator has a payout account
    let { data: creatorAccount } = await supabase
      .from('stripe_payout_accounts')
      .select('*')
      .eq('user_id', idea.created_by)
      .single()

    let stripeAccountId = creatorAccount?.stripe_account_id

    if (!stripeAccountId || !creatorAccount?.account_enabled) {
      try {
        // Try to create Stripe Connect Express account for creator
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US', // Default to US, should be configurable
          email: idea.author.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          metadata: {
            supabase_user_id: idea.created_by,
          },
        })

        stripeAccountId = account.id

        // Save or update payout account
        if (creatorAccount) {
          await supabase
            .from('stripe_payout_accounts')
            .update({
              stripe_account_id: stripeAccountId,
              account_enabled: false,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', idea.created_by)
        } else {
          await supabase
            .from('stripe_payout_accounts')
            .insert({
              user_id: idea.created_by,
              stripe_account_id: stripeAccountId,
              account_enabled: false,
            })
        }

        // Create account link for onboarding
        const accountLink = await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${req.headers.get('origin')}/profile?refresh=true`,
          return_url: `${req.headers.get('origin')}/profile?setup=complete`,
          type: 'account_onboarding',
        })

        return new Response(
          JSON.stringify({ 
            requiresOnboarding: true,
            onboardingUrl: accountLink.url,
            message: 'Creator needs to complete Stripe onboarding first'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      } catch (stripeError) {
        // Handle Stripe Connect not enabled error
        if (stripeError.message && stripeError.message.includes('Connect')) {
          return new Response(
            JSON.stringify({ 
              error: 'STRIPE_CONNECT_NOT_ENABLED',
              message: 'Payment processing is temporarily unavailable. The platform administrator needs to enable Stripe Connect to process creator payouts.',
              userMessage: 'Payment processing is currently being set up. Please try again later or contact support.'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 503, // Service Unavailable
            }
          )
        }
        
        // Re-throw other Stripe errors
        throw stripeError
      }
    }

    // Calculate platform fee (10%)
    const platformFee = Math.round(amount * 0.1)
    const creatorAmount = amount - platformFee

    // Create checkout session with application fee
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Idea: ${idea.title}`,
              description: `Purchase full rights to "${idea.title}" by ${idea.author.username || 'Anonymous'}`,
              images: idea.image ? [idea.image] : [],
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/profile?purchase=success&idea=${ideaId}`,
      cancel_url: `${req.headers.get('origin')}/?purchase=canceled`,
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          idea_id: ideaId,
          creator_id: idea.created_by,
          investor_id: investorId,
          platform_fee: platformFee.toString(),
          creator_amount: creatorAmount.toString(),
        },
      },
      metadata: {
        type: 'idea_purchase',
        idea_id: ideaId,
        creator_id: idea.created_by,
        investor_id: investorId,
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error creating payout session:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})