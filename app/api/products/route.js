
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET /api/products
// Menampilkan produk beserta kategori
export async function GET() {
  try {
    const pool = getPool();

    const [rows] = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.created_at,
        pc.category_name
      FROM products AS p
      LEFT JOIN product_categories AS pc
        ON p.id = pc.product_id
      ORDER BY p.id DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Gagal mengambil produk:', error);

    return NextResponse.json(
      { error: 'Gagal mengambil data produk' },
      { status: 500 }
    );
  }
}

// POST /api/products
// Menambahkan produk sekaligus kategorinya
export async function POST(request) {
  let connection;

  try {
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

    // Query 1: memasukkan data produk
    const [result] = await connection.query(
      `INSERT INTO products (name, description, price)
       VALUES (?, ?, ?)`,
      [name.trim(), description || null, Number(price)]
    );

    const productId = result.insertId;

    // Query 2: memasukkan kategori yang berelasi dengan produk
    await connection.query(
      `INSERT INTO product_categories (product_id, category_name)
       VALUES (?, ?)`,
      [productId, category_name.trim()]
    );

    await connection.commit();

    return NextResponse.json(
      {
        id: productId,
        name: name.trim(),
        description: description || null,
        price: Number(price),
        category_name: category_name.trim(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Gagal menyimpan produk:', error);

    return NextResponse.json(
      { error: 'Gagal menyimpan produk dan kategori' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
