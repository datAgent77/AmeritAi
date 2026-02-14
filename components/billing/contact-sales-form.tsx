"use client"

import React, { useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

interface ContactSalesFormProps {
    planId: string;
    onBack: () => void;
    onSuccess: () => void;
}

export function ContactSalesForm({ planId, onBack, onSuccess }: ContactSalesFormProps) {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: user?.displayName || '',
        email: user?.email || '',
        company: '',
        phone: '',
        message: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);

        try {
            // Save to Firestore 'upgrade_requests'
            await addDoc(collection(db, "upgrade_requests"), {
                userId: user.uid,
                email: formData.email,
                name: formData.name,
                company: formData.company,
                phone: formData.phone,
                message: formData.message,
                requestedPlan: planId,
                status: 'pending',
                createdAt: serverTimestamp(),
                userMetadata: {
                    displayName: user.displayName,
                    email: user.email
                }
            });

            // Keep latest request summary on user document for UI visibility
            await setDoc(doc(db, "users", user.uid), {
                lastUpgradeRequest: {
                    targetPlan: planId,
                    status: 'pending',
                    source: 'contact_sales_form',
                    requestedAt: serverTimestamp()
                }
            }, { merge: true });

            setIsSuccess(true);

            // Auto close after 3 seconds
            setTimeout(() => onSuccess(), 4000);

        } catch (error) {
            console.error("Error submitting upgrade request:", error);
            alert("Something went wrong. Please try again.");
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h3>
                <p className="text-gray-500 max-w-xs mx-auto mb-6">
                    Thank you, {formData.name}. Our sales team has received your request for the <strong>{planId.toUpperCase()}</strong> plan.
                </p>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 max-w-sm">
                    Is this urgent? You can also fast-track by sending payment to our IBAN below:
                    <br /><br />
                    <strong>TR12 3456 7890 1234 5678 90 (Iş Bankası)</strong>
                    <br />
                    Vion Corp.
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <button
                type="button"
                onClick={onBack}
                className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Plans
            </button>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Company Name</label>
                    <input
                        required
                        type="text"
                        placeholder="Acme Corp"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <input
                        required
                        type="tel"
                        placeholder="+90 555..."
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Additional Message (Optional)</label>
                <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your volume needs or any questions..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-lime-600 hover:bg-lime-700 text-white font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending Request...
                        </>
                    ) : (
                        `Request ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`
                    )}
                </button>
                <p className="text-xs text-center text-gray-400 mt-3">
                    Our team typically responds within 2 hours during business hours.
                </p>
            </div>
        </form>
    );
}
