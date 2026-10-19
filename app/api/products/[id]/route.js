
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET /api/products/:id
// Mengambil satu produk beserta kategorinya
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const pool = getPool();

    const [rows] = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.created_at,
        pc.category_name
      FROM products AS p
      LEFT JOIN product_categories AS pc
        ON p.id = pc.product_id
      WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Gagal mengambil data produk' },
      { status: 500 }
    );
  }
}

// PUT /api/products/:id
// Mengubah data produk sekaligus kategorinya
export async function PUT(request, { params }) {
  let connection;

  try {
    const { id } = await params;
    const body = await request.json();

    const { name, description, price, category_name } = body;

    if (
      !name?.trim() ||
      price === undefined ||
      price === '' ||
      !category_name?.trim()
    ) {
      return NextResponse.json(
        {
          error: 'Nama, harga, dan kategori produk wajib diisi',
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
      return NextResponse.json(
        { error: 'Harga harus berupa angka dan tidak boleh negatif' },
        { status: 400 }
      );
    }

    const pool = getPool();
    connection = await pool.getConnection();

    await connection.beginTransaction();

    // Memeriksa apakah produk tersedia
    const [products] = await connection.query(
      'SELECT id FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Query 1: mengubah data produk
    await connection.query(
      `UPDATE products
       SET name = ?, description = ?, price = ?
       WHERE id = ?`,
      [
        name.trim(),
        description || null,
        Number(price),
        id,
      ]
    );

    // Query 2: memperbarui kategori produk yang sudah ada
    const [categories] = await connection.query(
      'SELECT id FROM product_categories WHERE product_id = ?',
      [id]
    );

    if (categories.length > 0) {
      await connection.query(
        `UPDATE product_categories
         SET category_name = ?
         WHERE product_id = ?`,
        [category_name.trim(), id]
      );
    } else {
      // Jika kategori belum ada, buat kategori baru
      await connection.query(
        `INSERT INTO product_categories (product_id, category_name)
         VALUES (?, ?)`,
        [id, category_name.trim()]
      );
    }

    await connection.commit();

    return NextResponse.json({
      id: Number(id),
      name: name.trim(),
      description: description || null,
      price: Number(price),
      category_name: category_name.trim(),
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error(error);

    return NextResponse.json(
      { error: 'Gagal memperbarui produk dan kategori' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// DELETE /api/products/:id
// Menghapus produk beserta kategori terkait
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const pool = getPool();

    const [result] = await pool.query(
      'DELETE FROM products WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Gagal menghapus produk' },
      { status: 500 }
    );
  }
}
