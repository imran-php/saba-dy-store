import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderStorage, productStorage } from '@/utils/storage';
import { Order, Product } from '@/types';
import { ShoppingCart, Package, TrendingUp, Users } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const loadedOrders = await orderStorage.getOrders();
      setOrders(loadedOrders);
      const loadedProducts = await productStorage.getProducts();
      setProducts(loadedProducts);
    };
    fetchData();
  }, []);

  // Calculate statistics
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'new').length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const activeProducts = products.filter(product => product.isActive).length;

  const stats = [
    {
      title: 'Всего заказов',
      value: totalOrders.toString(),
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Новых заказов',
      value: pendingOrders.toString(),
      icon: Package,
      color: 'bg-orange-500',
    },
    {
      title: 'Общий доход',
      value: `${totalRevenue.toLocaleString('ru-RU')} ₽`,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Активных товаров',
      value: activeProducts.toString(),
      icon: Users,
      color: 'bg-purple-500',
    },
  ];

  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Новый';
      case 'pending_payment': return 'Ожидает оплаты';
      case 'paid': return 'Оплачен';
      case 'processing': return 'В обработке';
      case 'completed': return 'Выполнен';
      case 'shipped': return 'Отправлен';
      case 'delivered': return 'Доставлен';
      default: return 'Отменен';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'pending_payment': return 'bg-yellow-50 text-yellow-600';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const renderDeliveryDetails = (delivery: Order['delivery']) => {
    // Helper to format method name
    const formatMethod = (method: string) => {
      switch (method) {
        case 'pickup': return 'Самовывоз';
        case 'courier': return 'Курьер';
        case 'post': return 'Почта России';
        case 'cdek': return 'СДЭК';
        default: return method;
      }
    };

    if (delivery.method === 'pickup') {
      return <div className="text-sm text-gray-900">{formatMethod(delivery.method)}</div>;
    }

    return (
      <div className="flex flex-col">
        <div className="text-sm font-medium text-gray-900">
          {formatMethod(delivery.method)}
        </div>
        {delivery.address && (
          <div className="text-xs text-gray-500 break-words mt-0.5 max-w-xs">
            {delivery.address}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Обзор (v1.1)</h1>
      </div>
      {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            to="/admin/orders"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Управление заказами</h3>
                <p className="text-gray-600">Просмотр и управление всеми заказами магазина</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Link>

          <Link
            to="/admin/products"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Управление товарами</h3>
                <p className="text-gray-600">Добавление, редактирование и удаление товаров</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Последние заказы</h3>
          </div>
          
          {/* Mobile View (Cards) */}
          <div className="md:hidden">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Нет заказов для отображения
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">{order.id}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-gray-500 mt-1">
                        {order.totalAmount.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      {renderDeliveryDetails(order.delivery)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop View (Table) */}
          <div className="hidden md:block overflow-x-auto">
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
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customerName}
                    </td>
                    <td className="px-6 py-4">
                      {renderDeliveryDetails(order.delivery)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.totalAmount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentOrders.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                Нет заказов для отображения
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;