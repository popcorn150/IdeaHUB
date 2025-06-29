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

    // Check if we're using test mode keys
    const isTestMode = stripeSecretKey.startsWith('sk_test_')
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { priceId, userId, planType } = await req.json()

    if (!priceId || !userId) {
      throw new Error('Missing required parameters')
    }

    // Validate price ID format matches key mode
    const isPriceIdTest = priceId.includes('test') || priceId.startsWith('price_test_')
    
    if (isTestMode && !isPriceIdTest && !priceId.startsWith('price_')) {
      console.warn(`Using test mode key with price ID: ${priceId}`)
    } else if (!isTestMode && isPriceIdTest) {
      throw new Error('Cannot use test price IDs with live mode keys. Please use test mode Stripe keys for development.')
    }

    // Get or create Stripe customer
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', userId)
      .single()

    let customerId = existingCustomer?.customer_id

    if (!customerId) {
      // Get user email from auth
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      
      if (!user?.email) {
        throw new Error('User email not found')
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: userId,
        },
      })

      customerId = customer.id

      // Save customer to database
      await supabase
        .from('stripe_customers')
        .insert({
          user_id: userId,
          customer_id: customerId,
        })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: planType === 'lifetime' ? 'payment' : 'subscription',
      success_url: `${req.headers.get('origin')}/profile?success=true`,
      cancel_url: `${req.headers.get('origin')}/profile?canceled=true`,
      metadata: {
        user_id: userId,
        plan_type: planType,
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
    console.error('Error creating checkout session:', error)
    
    // Provide more specific error messages for common issues
    let errorMessage = error.message
    
    if (error.message.includes('No such price') && error.message.includes('live mode key was used')) {
      errorMessage = 'Stripe configuration error: You are using live mode keys with test mode price IDs. Please configure test mode keys in your Supabase Edge Function environment variables.'
    } else if (error.message.includes('No such price')) {
      errorMessage = 'The specified price ID was not found in Stripe. Please check your price configuration.'
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})