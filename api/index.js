const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

app.use(cors());
app.use(express.json());

// Inisialisasi Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Fallback untuk local testing jika menggunakan GOOGLE_APPLICATION_CREDENTIALS
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error.message);
  }
}

const db = admin.firestore();

// --- API ENDPOINTS ---

// 1. Get Menu
app.get('/api/menu', async (req, res) => {
  try {
    const snapshot = await db.collection('menu').get();
    const menu = [];
    snapshot.forEach(doc => {
      menu.push({ id: doc.id, ...doc.data() });
    });
    
    // Seed data default jika koleksi menu masih kosong
    if (menu.length === 0) {
      const defaultMenu = [
        { name: 'Kopi Susu Gula Aren', price: 18000, category: 'Coffee' },
        { name: 'Americano', price: 15000, category: 'Coffee' },
        { name: 'Matcha Latte', price: 22000, category: 'Non-Coffee' },
        { name: 'French Fries', price: 15000, category: 'Snack' }
      ];
      for (const item of defaultMenu) {
        const docRef = await db.collection('menu').add(item);
        menu.push({ id: docRef.id, ...item });
      }
    }

    res.status(200).json({ success: true, data: menu });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Tambah Menu Baru
app.post('/api/menu', async (req, res) => {
  try {
    const { name, price, category } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Nama dan harga wajib diisi' });
    }
    const newItem = { name, price: Number(price), category: category || 'General' };
    const docRef = await db.collection('menu').add(newItem);
    res.status(201).json({ success: true, data: { id: docRef.id, ...newItem } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Simpan Transaksi (Order)
app.post('/api/orders', async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, customerName } = req.body;
    
    if (!items || items.length === 0 || !totalAmount) {
      return res.status(400).json({ success: false, message: 'Item transaksi tidak boleh kosong' });
    }

    const orderData = {
      customerName: customerName || 'Pelanggan',
      items,
      totalAmount: Number(totalAmount),
      paymentMethod: paymentMethod || 'CASH',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('orders').add(orderData);
    res.status(201).json({ success: true, orderId: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export Express app untuk Vercel Serverless Function
module.exports = app;