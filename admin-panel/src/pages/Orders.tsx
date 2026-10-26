import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderStorage } from '@/utils/storage';
import { Order, OrderStatus } from '@/types';
import { Filter, Search, Package, Clock, CheckCircle, XCircle } from 'lucide-react';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, dateFilter]);

  const loadOrders = async () => {
    const loadedOrders = await orderStorage.getOrders();
    setOrders(loadedOrders);
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone.includes(searchTerm) ||
        order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.toDateString() === filterDate.toDateString();
      });
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    await orderStorage.updateOrder(orderId, { status: newStatus });
    loadOrders();
  };

  const deleteOrder = async (orderId: string) => {
    await orderStorage.deleteOrder(orderId);
    setShowDeleteConfirm(null);
    loadOrders();
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'pending_payment':
        return 'bg-yellow-50 text-yellow-600';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-teal-100 text-teal-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return 'Новый';
      case 'pending_payment':
        return 'Ожидает оплаты';
      case 'paid':
        return 'Оплачен';
      case 'processing':
        return 'В обработке';
      case 'shipped':
        return 'Отправлен';
      case 'delivered':
        return 'Доставлен';
      case 'completed':
        return 'Завершен';
      case 'cancelled':
        return 'Отменен';
      default:
        return status;
    }
  };

  const formatDeliveryMethod = (method: string) => {
    switch (method) {
      case 'pickup': return 'Самовывоз';
      case 'courier': return 'Курьер';
      case 'post': return 'Почта России';
      case 'cdek': return 'СДЭК';
      default: return method;
    }
  };

  const renderDeliveryDetails = (delivery: Order['delivery']) => {
    if (delivery.method === 'pickup') {
      return <div className="text-sm font-medium text-gray-900">{formatDeliveryMethod(delivery.method)}</div>;
    }

    return (
      <div className="flex flex-col">
        <div className="text-sm font-medium text-gray-900 mb-1">
          {formatDeliveryMethod(delivery.method)}
        </div>
        
        {/* Main combined address */}
        {delivery.address && (
          <div className="text-xs text-gray-800 font-medium mb-1 break-words">
            {delivery.address}
          </div>
        )}

        {/* Detailed components if available */}
        {(delivery.city || delivery.street || delivery.house) && (
          <div className="text-xs text-gray-500 space-y-0.5 bg-gray-50 p-1.5 rounded border border-gray-100">
            {delivery.city && <div><span className="font-semibold">Город:</span> {delivery.city}</div>}
            {delivery.street && <div><span className="font-semibold">Улица:</span> {delivery.street}</div>}
            {delivery.house && (
              <div>
                <span className="font-semibold">Дом:</span> {delivery.house}
                {delivery.apartment && <span className="ml-2"><span className="font-semibold">Кв:</span> {delivery.apartment}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Удалить заказ?</h3>
            <p className="text-gray-600 mb-6">
              Вы уверены, что хотите удалить заказ {showDeleteConfirm}? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => deleteOrder(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/admin" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Назад
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Управление заказами</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Поиск
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Номер заказа, имя, телефон, email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>

        {/* Orders List (Mobile) */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-bold text-gray-900">{order.id}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}
                >
                  {getStatusText(order.status)}
                </span>
              </div>
              
              <div className="mb-3">
                <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                <div className="text-xs text-gray-500">{order.customerPhone}</div>
                {order.customerEmail && (
                  <div className="text-xs text-gray-500">{order.customerEmail}</div>
                )}
              </div>

              <div className="mb-3 border-t border-gray-100 pt-2">
                <div className="text-xs font-semibold text-gray-700 mb-1">
                  {formatDeliveryMethod(order.delivery.method)}
                </div>
                {order.delivery.method !== 'pickup' && order.delivery.address && (
                  <div className="text-xs text-gray-600 break-words">
                    {order.delivery.address}
                  </div>
                )}
              </div>
              
              <div className="mb-3 border-t border-b border-gray-100 py-2">
                <div className="text-sm text-gray-900 font-medium mb-1">Товары ({order.items.length}):</div>
                <div className="text-xs text-gray-600">
                   {order.items.map(item => item.name).join(', ').slice(0, 100)}
                   {order.items.map(item => item.name).join(', ').length > 100 && '...'}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <div className="text-sm font-bold text-gray-900">
                  {order.totalAmount.toLocaleString('ru-RU')} ₽
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(order.id)}
                  className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 bg-gray-50 border border-gray-200"
                  title="Удалить заказ"
                  type="button"
                >
                  <div className="flex items-center space-x-1">
                     <XCircle className="h-4 w-4" />
                     <span className="text-xs font-medium">Удалить</span>
                  </div>
                </button>
              </div>
            </div>
          ))}
          {filteredOrders.length === 0 && (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">Нет заказов</p>
                <p className="text-sm">Попробуйте изменить фильтры поиска</p>
              </div>
            )}
        </div>

        {/* Orders Table (Desktop) */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Заказы ({filteredOrders.length})
              </h2>
              <button
                onClick={loadOrders}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Обновить
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    № Заказа
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Доставка
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Товары
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customerName}</div>
                      <div className="text-sm text-gray-500">{order.customerPhone}</div>
                      {order.customerEmail && (
                        <div className="text-sm text-gray-500">{order.customerEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDeliveryMethod(order.delivery.method)}
                      </div>
                      {order.delivery.method !== 'pickup' && order.delivery.address && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs break-words">
                          {order.delivery.address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.items.length} товар(ов)
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.items.map(item => item.name).join(', ').slice(0, 50)}
                        {order.items.map(item => item.name).join(', ').length > 50 && '...'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.totalAmount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setShowDeleteConfirm(order.id)}
                        className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                        title="Удалить заказ"
                        type="button"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">Нет заказов</p>
                <p className="text-sm">Попробуйте изменить фильтры поиска</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
