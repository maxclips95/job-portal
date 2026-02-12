import { useState, useEffect } from 'react';
import { referralService } from '@/services/referral.service';
import { CreditCard, Plus, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface PaymentMethod {
  id: string;
  method: string;
  is_verified: boolean;
  primary: boolean;
  created_at: string;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  frequency: string;
  requested_at: string;
  completed_at?: string;
}

export const PayoutManagement: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [showRequestPayout, setShowRequestPayout] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    method: '',
    stripeId: '',
    bankAccount: '',
    paypalEmail: '',
  });

  const [payoutForm, setPayoutForm] = useState({
    paymentMethodId: '',
    amount: '',
    frequency: 'monthly',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [methods, payoutsList] = await Promise.all([
        referralService.getPaymentMethods(),
        referralService.getPayouts(),
      ]);
      setPaymentMethods(methods || []);
      setPayouts(payoutsList || []);
    } catch (error) {
      console.error('Failed to load payout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await referralService.addPaymentMethod(formData.method, {
        stripeId: formData.stripeId,
        bankAccount: formData.bankAccount,
        paypalEmail: formData.paypalEmail,
      });
      setFormData({ method: '', stripeId: '', bankAccount: '', paypalEmail: '' });
      setShowAddMethod(false);
      await loadData();
    } catch (error) {
      console.error('Failed to add payment method:', error);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await referralService.requestPayout(
        payoutForm.paymentMethodId,
        parseFloat(payoutForm.amount),
        payoutForm.frequency
      );
      setPayoutForm({ paymentMethodId: '', amount: '', frequency: 'monthly' });
      setShowRequestPayout(false);
      await loadData();
    } catch (error) {
      console.error('Failed to request payout:', error);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (confirm('Are you sure? This will remove the payment method.')) {
      try {
        await referralService.deletePaymentMethod(id);
        await loadData();
      } catch (error) {
        console.error('Failed to delete payment method:', error);
      }
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'credit-card':
        return 'Credit Card';
      case 'bank-transfer':
        return 'Bank Transfer';
      case 'paypal':
        return 'PayPal';
      case 'stripe':
        return 'Stripe';
      default:
        return method;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'processing':
        return <Clock className="text-blue-600" size={20} />;
      case 'pending':
        return <AlertCircle className="text-yellow-600" size={20} />;
      case 'failed':
        return <AlertCircle className="text-red-600" size={20} />;
      default:
        return <Clock className="text-gray-600" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-40 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Methods Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
          <button
            onClick={() => setShowAddMethod(!showAddMethod)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Add Method
          </button>
        </div>

        {/* Add Payment Method Form */}
        {showAddMethod && (
          <form onSubmit={handleAddPaymentMethod} className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select method</option>
                  <option value="credit-card">Credit Card</option>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>

              {formData.method === 'paypal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Email</label>
                  <input
                    type="email"
                    value={formData.paypalEmail}
                    onChange={(e) => setFormData({ ...formData, paypalEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {formData.method === 'stripe' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Payment Method ID</label>
                  <input
                    type="text"
                    value={formData.stripeId}
                    onChange={(e) => setFormData({ ...formData, stripeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="pm_..."
                  />
                </div>
              )}

              {formData.method === 'bank-transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Account number"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Add Method
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMethod(false)}
                  className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Payment Methods List */}
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <CreditCard size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600">No payment methods added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.id} className="bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <CreditCard className="text-blue-600" size={24} />
                  <div>
                    <p className="font-medium text-gray-900">{getPaymentMethodLabel(method.method)}</p>
                    <p className="text-sm text-gray-600">
                      {method.is_verified ? '✓ Verified' : '⚠ Unverified'} • Added {new Date(method.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {method.primary && (
                    <span className="ml-auto bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Primary
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteMethod(method.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Payout Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payouts</h2>
          <button
            onClick={() => setShowRequestPayout(!showRequestPayout)}
            disabled={paymentMethods.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            <Plus size={18} />
            Request Payout
          </button>
        </div>

        {/* Request Payout Form */}
        {showRequestPayout && (
          <form onSubmit={handleRequestPayout} className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={payoutForm.paymentMethodId}
                  onChange={(e) => setPayoutForm({ ...payoutForm, paymentMethodId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {getPaymentMethodLabel(method.method)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={payoutForm.frequency}
                  onChange={(e) => setPayoutForm({ ...payoutForm, frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="on-demand">On-Demand</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Request Payout
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestPayout(false)}
                  className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Payouts History */}
        {payouts.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <Clock size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600">No payouts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => (
              <div key={payout.id} className="bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {getStatusIcon(payout.status)}
                  <div>
                    <p className="font-medium text-gray-900">${payout.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      {payout.frequency.charAt(0).toUpperCase() + payout.frequency.slice(1)} • Requested{' '}
                      {new Date(payout.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  payout.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : payout.status === 'processing'
                      ? 'bg-blue-100 text-blue-800'
                      : payout.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                }`}>
                  {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
