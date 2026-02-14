import { useEffect, useState } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, Package, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/helpers';
import type { Product } from '../types';

interface CartItem {
  product: Product;
  quantity: number;
}

const categoryLabels: Record<string, string> = {
  rental: 'Cho thuê',
  food: 'Đồ ăn',
  drink: 'Nước uống',
  equipment: 'Dụng cụ',
  other: 'Khác',
};

const categoryColors: Record<string, string> = {
  rental: 'bg-blue-50 text-blue-700 border-blue-200',
  food: 'bg-orange-50 text-orange-700 border-orange-200',
  drink: 'bg-teal-50 text-teal-700 border-teal-200',
  equipment: 'bg-gray-50 text-gray-700 border-gray-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'drink' as Product['category'],
    price: 0,
    rental_price_per_hour: 0,
    stock_quantity: 0,
    min_stock: 5,
    barcode: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('category, name');
    setProducts(data || []);
    setLoading(false);
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const lowStock = products.filter((p) => p.stock_quantity <= p.min_stock);

  function openCreateProduct() {
    setEditProduct(null);
    setProductForm({ name: '', category: 'drink', price: 0, rental_price_per_hour: 0, stock_quantity: 0, min_stock: 5, barcode: '' });
    setShowProductModal(true);
  }

  function openEditProduct(p: Product) {
    setEditProduct(p);
    setProductForm({
      name: p.name,
      category: p.category,
      price: p.price,
      rental_price_per_hour: p.rental_price_per_hour,
      stock_quantity: p.stock_quantity,
      min_stock: p.min_stock,
      barcode: p.barcode,
    });
    setShowProductModal(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (editProduct) {
      await supabase.from('products').update(productForm).eq('id', editProduct.id);
    } else {
      await supabase.from('products').insert(productForm);
    }
    setShowProductModal(false);
    loadProducts();
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    setCart([]);
    alert('Thanh toán thành công!');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-8rem)]">
      <div className="flex-1 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white/80 backdrop-blur-sm"
            />
          </div>
          <button onClick={openCreateProduct} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50 whitespace-nowrap btn-shine">
            <Plus className="w-4 h-4" />
            Thêm SP
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'drink', 'food', 'rental', 'equipment', 'other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm' : 'bg-white/80 border border-gray-200 text-gray-600 hover:bg-white'
                }`}
            >
              {cat === 'all' ? 'Tất cả' : categoryLabels[cat]}
            </button>
          ))}
        </div>

        {lowStock.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs text-amber-700">
              {lowStock.length} sản phẩm sắp hết hàng: {lowStock.map((p) => p.name).join(', ')}
            </span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Chưa có sản phẩm nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                onContextMenu={(e) => { e.preventDefault(); openEditProduct(p); }}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 p-4 text-left hover:shadow-md hover:border-emerald-200 transition-all group card-hover"
              >
                <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block border mb-2 ${categoryColors[p.category]}`}>
                  {categoryLabels[p.category]}
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1 truncate">{p.name}</h4>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(p.price)}</p>
                <p className="text-xs text-gray-400 mt-1">Tồn: {p.stock_quantity}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:w-80 xl:w-96 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-gray-900">Giỏ hàng</h3>
          {cart.length > 0 && (
            <span className="ml-auto bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-100">{cart.length}</span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <ShoppingCart className="w-12 h-12 mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Chưa có sản phẩm</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.product.price * item.quantity)}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-600 mt-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tổng cộng</span>
                <span className="text-xl font-bold text-gray-900">{formatCurrency(cartTotal)}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200 btn-shine"
              >
                Thanh toán
              </button>
            </div>
          </>
        )}
      </div>

      {showProductModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowProductModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
                <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                  <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value as Product['category'] })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán (VNĐ)</label>
                  <input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho</label>
                  <input type="number" value={productForm.stock_quantity} onChange={(e) => setProductForm({ ...productForm, stock_quantity: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cảnh báo hết (min)</label>
                  <input type="number" value={productForm.min_stock} onChange={(e) => setProductForm({ ...productForm, min_stock: +e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/50">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
