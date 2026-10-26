import React, { useState } from 'react';
import { adminStorage } from '@/utils/storage';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

const Settings: React.FC = () => {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: 'Новые PIN-коды не совпадают' });
      return;
    }

    if (newPin.length < 4) {
      setMessage({ type: 'error', text: 'PIN-код должен содержать минимум 4 символа' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await adminStorage.changePin(oldPin, newPin);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'PIN-код успешно изменен' });
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setMessage({ type: 'error', text: result.error || 'Ошибка при смене PIN-кода' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Произошла ошибка' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow max-w-md mx-auto">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Смена PIN-кода</h2>
                <p className="text-sm text-gray-500">Обновите код доступа к админ-панели</p>
              </div>
            </div>

            {message && (
              <div className={`mb-4 p-4 rounded-md flex items-center ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2" />
                )}
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Текущий PIN-код
                </label>
                <input
                  type="password"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Новый PIN-код
                </label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Подтвердите новый PIN-код
                </label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
