'use client';

import React, { useEffect, useState } from 'react';
import { useApplicationStore } from '@/stores/applicationStore';
import { DollarSign, Calendar, Building2, CheckCircle, XCircle } from 'lucide-react';

export default function JobOffersPage() {
  const [rejectingId, setRejectingId] = useState<string | number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const {
    offers,
    offerLoading,
    offerError,
    fetchOffers,
    acceptOffer,
    rejectOffer,
  } = useApplicationStore();

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleAcceptOffer = async (offerId: string | number) => {
    if (window.confirm('Are you sure you want to accept this offer?')) {
      await acceptOffer(offerId);
    }
  };

  const handleRejectOffer = async (offerId: string | number) => {
    await rejectOffer(offerId, rejectReason);
    setRejectingId(null);
    setRejectReason('');
  };

  if (offerLoading && offers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Job Offers</h1>
        <p className="text-gray-600 mb-8">Review and manage your job offers</p>

        {offerError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{offerError}</p>
          </div>
        )}

        {offers.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow">
            <p className="text-gray-600 text-lg mb-4">No job offers yet</p>
            <p className="text-gray-500">
              Job offers will appear here once employers decide to move forward with your application
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 ${
                  offer.status === 'pending'
                    ? 'border-yellow-400 bg-white'
                    : offer.status === 'accepted'
                    ? 'border-green-400 bg-green-50'
                    : 'border-red-400 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900">{offer.position}</h3>
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Building2 size={18} />
                      <p>{offer.companyName}</p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${
                      offer.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : offer.status === 'accepted'
                        ? 'bg-green-100 text-green-700 flex items-center gap-2'
                        : 'bg-red-100 text-red-700 flex items-center gap-2'
                    }`}
                  >
                    {offer.status === 'accepted' && <CheckCircle size={16} />}
                    {offer.status === 'rejected' && <XCircle size={16} />}
                    {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                  </span>
                </div>

                {/* Offer Details */}
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Annual Salary</p>
                    <div className="flex items-center gap-2">
                      <DollarSign size={20} className="text-blue-600" />
                      <p className="text-2xl font-bold text-gray-900">
                        {offer.salary.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Start Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar size={20} className="text-blue-600" />
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(offer.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                {offer.benefits && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Benefits & Perks</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{offer.benefits}</p>
                  </div>
                )}

                {/* Rejection Reason */}
                {offer.status === 'rejected' && (
                  <div className="mb-6 p-4 bg-red-100 rounded-lg border border-red-300">
                    <p className="text-sm font-semibold text-red-900 mb-2">Reason for Rejection</p>
                    <p className="text-red-800">Offer was rejected</p>
                  </div>
                )}

                {/* Reject Offer Form */}
                {rejectingId === offer.id ? (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
                    <label className="block mb-2 font-semibold text-gray-900">
                      Reason for Rejection (Optional)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Share your reason for rejecting this offer..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectOffer(offer.id)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
                      >
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Action Buttons */}
                {offer.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Accept Offer
                    </button>
                    <button
                      onClick={() => setRejectingId(offer.id)}
                      className="flex-1 px-4 py-2 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle size={18} />
                      Reject Offer
                    </button>
                  </div>
                )}

                {offer.status === 'accepted' && (
                  <div className="p-4 bg-green-100 rounded-lg border border-green-300 text-center">
                    <p className="text-green-900 font-semibold">
                      You have accepted this offer. Congratulations!
                    </p>
                    <p className="text-green-800 text-sm mt-1">
                      Please be ready for your start date: {new Date(offer.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {offer.status === 'rejected' && (
                  <div className="p-4 bg-gray-100 rounded-lg border border-gray-300 text-center">
                    <p className="text-gray-900 font-semibold">
                      You have rejected this offer
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

