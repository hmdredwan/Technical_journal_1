// src/app/contact/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Mail, Phone, Send, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import { apiUrl } from '@/utils/api';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSubmitted(false);
    try {
      const res = await fetch(apiUrl('contact/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to send message');
      }
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
     <section 
  className="relative bg-cover bg-center bg-no-repeat py-24 md:py-32 text-white overflow-hidden"
  style={{
    backgroundImage: "url('/images/contact-header-bg.jpeg')", 
  }}
>
  <div className="absolute inset-0 bg-gradient-to-r from-blue-950/70 to-indigo-950/70" />
  
  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight drop-shadow-2xl">
      Contact Us
    </h1>
    <p className="text-xl md:text-2xl max-w-3xl mx-auto opacity-95 drop-shadow-lg">
      We&apos;re here to help. Reach out to the Technical Journal team.
    </p>
  </div>
</section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-8">Get in Touch</h2>

              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                        H
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Head Office</h3>
                        {/* <p className="text-sm text-gray-500">RRI Faridpur</p> */}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-7">
                      River Research Institute<br />
                      Faridpur Head Office<br />
                      Dhaka Road, Faridpur-7800<br />
                      Bangladesh
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                        D
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Dhaka Office</h3>
                        {/* <p className="text-sm text-gray-500">City Liaison Office</p> */}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-7">
                      River Research Institute<br />
                      72 Green Road, Dhaka-1215<br />
                      Bangladesh
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                  <div className="grid gap-4 grid-cols-1">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                        <Phone className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Phone</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <a href="tel:+8801711223344" className="hover:underline block">+880 01557473954</a>
                          <a href="tel:+8809613800800" className="hover:underline block">+880 01334-769601</a>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                        <Mail className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <a href="mailto:info@riverresearch.org" className="hover:underline block">dg@rri.gov.bd</a>
                          <a href="mailto:editor@riverresearch.org" className="hover:underline block"> rribd@yahoo.com</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

<div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
  <h3 className="text-lg font-semibold text-gray-900 mb-6">Follow Us</h3>
  
  <div className="flex gap-4 justify-center sm:justify-start">
    <a
      href="https://www.facebook.com/riverresearchinstitute"
      target="_blank"
      rel="noreferrer noopener"
      className="group"
      aria-label="Facebook"
    >
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white transition-all duration-300 group-hover:bg-blue-700 group-hover:scale-110">
        <Facebook className="h-7 w-7" />
      </div>
    </a>

    <a
      href="https://twitter.com/riverresearch"
      target="_blank"
      rel="noreferrer noopener"
      className="group"
      aria-label="Twitter"
    >
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-white transition-all duration-300 group-hover:bg-sky-600 group-hover:scale-110">
        <Twitter className="h-7 w-7" />
      </div>
    </a>

    <a
      href="https://www.linkedin.com/company/river-research-institute"
      target="_blank"
      rel="noreferrer noopener"
      className="group"
      aria-label="LinkedIn"
    >
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-white transition-all duration-300 group-hover:bg-slate-900 group-hover:scale-110">
        <Linkedin className="h-7 w-7" />
      </div>
    </a>

    <a
      href="https://www.instagram.com/riverresearchinstitute"
      target="_blank"
      rel="noreferrer noopener"
      className="group"
      aria-label="Instagram"
    >
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500 text-white transition-all duration-300 group-hover:bg-pink-600 group-hover:scale-110">
        <Instagram className="h-7 w-7" />
      </div>
    </a>
  </div>
</div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-lg border border-gray-100">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8">Send us a Message</h2>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl mb-8 text-center">
                  Thank you for your message! We&apos;ll get back to you soon.
                </div>
              ) : null}
              {error ? (
                <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl mb-8 text-center">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Manuscript Inquiry, Review Invitation..."
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    placeholder="How can we help you today?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Location Map Section */}
{/* Location Map Section */}
<section className="bg-gray-100 py-16">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-10">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Our Locations</h2>
        <p className="text-gray-600 leading-relaxed">
          We now support two operational locations for RRI. The Faridpur head office handles research coordination and administration, while our Dhaka office is the primary liaison hub for authors and reviewers.
        </p>
      </div>
    </div>

    <div className="grid lg:grid-cols-2 gap-8">
      {/* Faridpur Office */}
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-full bg-red-500" />
            <div>
              <p className="font-semibold text-gray-900">Head Office - Faridpur</p>
              <p className="text-sm text-gray-500">River Research Institute, Faridpur</p>
            </div>
          </div>
        </div>
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.584387675565!2d89.83621457822352!3d23.583365840488984!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39fe3aaf85e3297f%3A0x588727938f655ea0!2sBangladesh%20River%20Research%20Institute!5e0!3m2!1sen!2sbd!4v1779284280141!5m2!1sen!2sbd" 
          width="100%" 
          height="420" 
          style={{ border: 0 }}
          allowFullScreen 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full"
        />
      </div>

      {/* Dhaka Office */}
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-full bg-blue-500" />
            <div>
              <p className="font-semibold text-gray-900">Dhaka Office</p>
              <p className="text-sm text-gray-500">City Liaison Office, Green Road</p>
            </div>
          </div>
        </div>
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651.8548543731536!2d90.3856731748191!3d23.752554788694603!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b9c8c1b60c51%3A0x92a3121e8178db00!2sRiver%20Research%20Institute!5e0!3m2!1sen!2sbd!4v1779284316921!5m2!1sen!2sbd" 
          width="100%" 
          height="420" 
          style={{ border: 0 }}
          allowFullScreen 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full"
        />
      </div>
    </div>

    <div className="text-center mt-8">
      <a
        href="https://www.google.com/maps/dir/23.583439586107524,89.84120348665874/23.752590641825794,90.38821343687113"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        View both locations together on Google Maps →
      </a>
    </div>
  </div>
</section>
    </div>
  );
}