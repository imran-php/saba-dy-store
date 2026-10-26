import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productStorage } from '@/utils/storage';
import { Product } from '@/types';
import { Plus, Edit, Trash2, Package, Search, Filter } from 'lucide-react';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    composition: '',
    usage: '',
    price: 0,
    isActive: true,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, statusFilter]);

  const loadProducts = async () => {
    const loadedProducts = await productStorage.getProducts();
    setProducts(loadedProducts);
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(product =>
        statusFilter === 'active' ? product.isActive : !product.isActive
      );
    }

    setFilteredProducts(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('composition', formData.composition);
    data.append('usage', formData.usage);
    data.append('price', formData.price.toString());
    data.append('isActive', formData.isActive ? 'true' : 'false');
    data.append('inStock', 'true'); // Default to true for now
    
    if (selectedFile) {
      data.append('image', selectedFile);
    } else if (editingProduct && editingProduct.image) {
      // If editing and no new file selected, send the old image path as text
      data.append('image', editingProduct.image);
    }

    if (editingProduct) {
      await productStorage.updateProduct(editingProduct.id, data);
    } else {
      await productStorage.addProduct(data);
    }
    
    loadProducts();
    closeModal();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      composition: product.composition,
      usage: product.usage,
      price: product.price,
      isActive: product.isActive,
    });
    setSelectedFile(null); // Reset file input
    setShowModal(true);
  };

  const handleDelete = async (productId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот товар?')) {
      await productStorage.deleteProduct(productId);
      loadProducts();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      composition: '',
      usage: '',
      price: 0,
      isActive: true,
    });
    setSelectedFile(null);
  };

  const statusOptions = [
    { value: 'all', label: 'Все товары' },
    { value: 'active', label: 'Активные' },
    { value: 'inactive', label: 'Неактивные' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/admin" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Назад
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Управление товарами</h1>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить товар
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Поиск
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Название или описание товара"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Статус
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Товары ({filteredProducts.length})
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-gray-400 mr-2" />
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Редактировать"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">{product.description}</p>
                
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {product.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    <div>Создан: {new Date(product.createdAt).toLocaleDateString('ru-RU')}</div>
                    <div>Обновлен: {new Date(product.updatedAt).toLocaleDateString('ru-RU')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium">Нет товаров</p>
              <p className="text-sm">Попробуйте изменить фильтры поиска или добавьте новый товар</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название товара *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Изображение товара
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {editingProduct && editingProduct.image && !selectedFile && (
                  <p className="mt-2 text-xs text-gray-500">
                    Текущее изображение: {editingProduct.image.startsWith('/') ? 'Загружено' : editingProduct.image}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Состав
                </label>
                <textarea
                  rows={2}
                  value={formData.composition}
                  onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Способ применения
                </label>
                <textarea
                  rows={2}
                  value={formData.usage}
                  onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Цена (₽) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Статус
                  </label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Активен</option>
                    <option value="inactive">Неактивен</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {editingProduct ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;