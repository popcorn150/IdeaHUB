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

    // Ensure creator has a wallet
    const { data: wallet, error: walletError } = await supabase
      .from('creator_wallets')
      .select('id')
      .eq('user_id', idea.created_by)
      .single()

    if (walletError || !wallet) {
      // Create wallet for creator
      const { data: newWallet, error: createWalletError } = await supabase
        .from('creator_wallets')
        .insert({
          user_id: idea.created_by
        })
        .select('id')
        .single()

      if (createWalletError) {
        throw new Error('Failed to create creator wallet')
      }
    }

    // Calculate platform fee (10%)
    const platformFee = Math.round(amount * 0.1)
    const creatorAmount = amount - platformFee

    // Create checkout session - money goes to platform, we'll handle creator wallet internally
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
      metadata: {
        type: 'wallet_purchase',
        idea_id: ideaId,
        creator_id: idea.created_by,
        investor_id: investorId,
        platform_fee: platformFee.toString(),
        creator_amount: creatorAmount.toString(),
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
    console.error('Error creating wallet purchase session:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})