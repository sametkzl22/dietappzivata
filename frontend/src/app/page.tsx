'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight, ChefHat, Bot, Activity, Sparkles, Check,
  Users, Salad, Brain, Zap, Heart, Target
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 pt-20 pb-32">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-200 rounded-full opacity-20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-200 rounded-full opacity-20 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Personalization
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-tight">
              Your Personal
              <span className="block bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                AI Dietitian
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Get personalized meal plans based on your body metrics, pantry ingredients, and health goals.
              Powered by Google Gemini AI for intelligent nutrition coaching.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-lg shadow-xl shadow-emerald-200/50 hover:shadow-emerald-300/50 hover:scale-105 transition-all"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold text-lg hover:border-emerald-300 hover:text-emerald-600 transition-all"
              >
                See How It Works
              </Link>
            </div>

            {/* Social Proof */}
            <div className="mt-12 flex items-center justify-center gap-8 text-slate-500">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">10k+ Active Users</span>
              </div>
              <div className="flex items-center gap-2">
                <Salad className="h-5 w-5" />
                <span className="text-sm font-medium">50k+ Meals Planned</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900">Everything You Need</h2>
            <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
              A complete nutrition management system designed for your unique needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 - Smart Pantry */}
            <div className="group p-8 rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200/50 mb-6">
                <ChefHat className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Smart Pantry</h3>
              <p className="text-slate-600 leading-relaxed">
                Cook with what you have! Add your pantry ingredients and get recipes that match your available items. Zero food waste.
              </p>
              <ul className="mt-6 space-y-2">
                {['Ingredient tracking', 'Recipe matching', 'Shopping list'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-orange-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 2 - AI Coach */}
            <div className="group p-8 rounded-3xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-200/50 mb-6">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">AI Coach</h3>
              <p className="text-slate-600 leading-relaxed">
                Chat with our Gemini-powered AI coach for personalized nutrition advice, recipe suggestions, and motivation.
              </p>
              <ul className="mt-6 space-y-2">
                {['24/7 availability', 'Personalized tips', 'Answers questions'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-purple-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 3 - Health Tracking */}
            <div className="group p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50 mb-6">
                <Activity className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Health Tracking</h3>
              <p className="text-slate-600 leading-relaxed">
                Visualize your BMI, body fat percentage, and caloric needs with our dynamic health dashboard.
              </p>
              <ul className="mt-6 space-y-2">
                {['BMI calculator', 'Body fat %', 'TDEE tracking'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900">How It Works</h2>
            <p className="mt-4 text-xl text-slate-600">Three simple steps to your personalized nutrition plan</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative text-center">
              <div className="w-16 h-16 rounded-full bg-white shadow-xl shadow-emerald-100 flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-50">
                <span className="text-2xl font-bold text-emerald-600">1</span>
              </div>
              <div className="absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-200 to-transparent hidden md:block" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Create Your Profile</h3>
              <p className="text-slate-600">
                Enter your body measurements, activity level, and health goals. Our system calculates your exact needs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="w-16 h-16 rounded-full bg-white shadow-xl shadow-emerald-100 flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-50">
                <span className="text-2xl font-bold text-emerald-600">2</span>
              </div>
              <div className="absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-200 to-transparent hidden md:block" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Add Your Ingredients</h3>
              <p className="text-slate-600">
                Tell us what&apos;s in your pantry. We&apos;ll prioritize recipes that use your available ingredients.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-white shadow-xl shadow-emerald-100 flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-50">
                <span className="text-2xl font-bold text-emerald-600">3</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Get Your Plan</h3>
              <p className="text-slate-600">
                Receive a personalized daily meal plan with macros, calories, and easy-to-follow recipes.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-lg shadow-xl shadow-emerald-200/50 hover:shadow-emerald-300/50 hover:scale-105 transition-all"
            >
              Get Started Now
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Brain, value: 'AI', label: 'Powered by Gemini' },
              { icon: Zap, value: '500+', label: 'Recipes' },
              { icon: Heart, value: '95%', label: 'Success Rate' },
              { icon: Target, value: '100%', label: 'Personalized' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="h-8 w-8 mx-auto text-emerald-500 mb-3" />
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-br from-emerald-500 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Nutrition?
          </h2>
          <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">
            Join thousands of users who have already improved their health with personalized AI nutrition planning.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-white text-emerald-600 font-bold text-lg shadow-2xl hover:scale-105 transition-all"
          >
            Start Your Free Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <span className="text-xl">🥗</span>
              </div>
              <span className="text-xl font-bold text-white">NutriPlan</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8 text-sm">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="#features" className="hover:text-white transition-colors">Features</Link>
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
              <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            </div>

            {/* Copyright */}
            <p className="text-sm">
              © {new Date().getFullYear()} NutriPlan. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
