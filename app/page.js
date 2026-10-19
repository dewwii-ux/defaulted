
'use client';

import { useEffect, useState } from 'react';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category_name: '',
};

export default function Home() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Mengambil data produk beserta kategori dari backend
  async function loadProducts() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/products');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat data produk');
      }

      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // Mengubah nilai input form
  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Mengisi form ketika tombol Edit ditekan
  function startEdit(product) {
    setEditingId(product.id);

    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      category_name: product.category_name || '',
    });

    setError('');
  }

  // Membatalkan proses edit
  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  // Menambah atau memperbarui produk dan kategori
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingId
        ? `/api/products/${editingId}`
        : '/api/products';

      const method = editingId ? 'PUT' : 'POST';

      const payload = {
        ...form,
        price: Number(form.price),
        category_name: form.category_name.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan data produk');
      }

      setForm(emptyForm);
      setEditingId(null);

      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Menghapus produk
  async function handleDelete(id) {
    if (!confirm('Yakin ingin menghapus produk ini?')) {
      return;
    }

    setError('');

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus produk');
      }

      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main>
      <h1>CRUD Produk</h1>
      <p className="subtitle">Next.js + MySQL (Aiven)</p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h3>
          {editingId ? 'Edit Produk' : 'Tambah Produk Baru'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="name">Nama Produk</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Misal: Kopi Susu"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="description">Deskripsi</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Deskripsi singkat produk (opsional)"
            />
          </div>

          <div className="form-row">
            <label htmlFor="price">Harga (Rp)</label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={handleChange}
              placeholder="Misal: 15000"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="category_name">Kategori Produk</label>
            <input
              id="category_name"
              name="category_name"
              value={form.category_name}
              onChange={handleChange}
              placeholder="Misal: Minuman"
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving
                ? 'Menyimpan...'
                : editingId
                  ? 'Update'
                  : 'Simpan'}
            </button>

            {editingId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelEdit}
                disabled={saving}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="status">
        {loading
          ? 'Memuat data...'
          : `${products.length} produk ditemukan`}
      </div>

      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Deskripsi</th>
            <th>Harga</th>
            <th>Kategori</th>
            <th>Aksi</th>
          </tr>
        </thead>

        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.description || '-'}</td>
              <td>
                Rp {Number(p.price).toLocaleString('id-ID')}
              </td>
              <td>{p.category_name || '-'}</td>
              <td>
                <button
                  type="button"
                  className="btn-edit"
                  onClick={() => startEdit(p)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => handleDelete(p.id)}
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!loading && products.length === 0 && (
        <div className="empty">
          Belum ada produk. Tambahkan produk pertama di atas.
        </div>
      )}
    </main>
  );
}
