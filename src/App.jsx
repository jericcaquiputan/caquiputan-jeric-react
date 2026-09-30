import React, { useEffect, useState } from 'react';
import { request } from './api';

const blank = { product_name: '', description: '', price: '', quantity: '' };

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('lab6-session') || 'null'); }
    catch { return null; }
  });
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadProducts(token = session?.access_token) {
    const result = await request('/api/products', { token });
    setProducts(Array.isArray(result) ? result : result?.products || []);
  }

  useEffect(() => {
    if (!session?.access_token) return;
    loadProducts(session.access_token).catch((err) => {
      if (/401|unauthorized|token/i.test(err.message)) logout(false);
      else setError(err.message);
    });
  }, [session?.access_token]);

  async function login(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await request('/api/login', {
        method: 'POST', body: JSON.stringify(credentials),
      });
      if (!data?.access_token) throw new Error('The API did not return an access token.');
      const next = { ...data, username: credentials.username };
      sessionStorage.setItem('lab6-session', JSON.stringify(next));
      setSession(next);
      setCredentials({ username: '', password: '' });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function logout(callApi = true) {
    if (callApi && session?.refresh_token) {
      try {
        await request('/api/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
      } catch { /* Local logout must still succeed. */ }
    }
    sessionStorage.removeItem('lab6-session');
    setSession(null); setProducts([]); setForm(blank); setEditingId(null);
    setNotice(''); setError('');
  }

  function edit(product) {
    setEditingId(product.id);
    setForm({
      product_name: product.product_name,
      description: product.description || '',
      price: String(product.price),
      quantity: String(product.quantity),
    });
    setError(''); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        product_name: form.product_name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        quantity: Number(form.quantity),
      };
      await request(editingId ? `/api/products/${editingId}` : '/api/products', {
        token: session.access_token,
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setNotice(editingId ? 'Product updated.' : 'Product added.');
      setForm(blank); setEditingId(null);
      await loadProducts();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function remove(product) {
    if (!window.confirm(`Delete “${product.product_name}”?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/api/products/${product.id}`, {
        token: session.access_token, method: 'DELETE',
      });
      if (editingId === product.id) { setEditingId(null); setForm(blank); }
      setNotice('Product deleted.');
      await loadProducts();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (!session) return (
    <main className="login-layout">
      <section className="login-panel">
        <span className="eyebrow">Laboratory exercise 6</span>
        <h1>Product Manager</h1>
        <p>Sign in to manage your product catalog.</p>
        <form onSubmit={login}>
          <label>Username
            <input autoComplete="username" required value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} />
          </label>
          <label>Password
            <input type="password" autoComplete="current-password" required value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} />
          </label>
          {error && <p className="message error" role="alert">{error}</p>}
          <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div><span className="eyebrow">Product management</span><h1>Products</h1></div>
        <div className="user-actions"><span>Signed in as <strong>{session.username}</strong></span>
          <button className="text-button" onClick={() => logout()}>Log out</button></div>
      </header>
      {error && <p className="message error" role="alert">{error}</p>}
      {notice && <p className="message success" role="status">{notice}</p>}
      <section className="grid">
        <div className="card form-card">
          <h2>{editingId ? 'Edit product' : 'Add product'}</h2>
          <p className="muted">Enter the details shown in your catalog.</p>
          <form onSubmit={save}>
            <label>Product name
              <input required maxLength="100" value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
            </label>
            <label>Description
              <textarea rows="4" required value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="two-columns">
              <label>Price
                <input type="number" min="0" max="99999999.99" step="0.01" required value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </label>
              <label>Quantity
                <input type="number" min="0" step="1" required value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </label>
            </div>
            <div className="form-actions">
              <button className="primary" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}</button>
              {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel</button>}
            </div>
          </form>
        </div>
        <div className="card list-card">
          <div className="list-heading"><div><h2>Product list</h2><p className="muted">{products.length} {products.length === 1 ? 'product' : 'products'}</p></div>
            <button className="secondary" onClick={() => loadProducts().catch((err) => setError(err.message))}>Refresh</button></div>
          {products.length === 0 ? <p className="empty">No products yet. Add your first product.</p> : (
            <div className="table-wrap"><table><thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Actions</th></tr></thead>
              <tbody>{products.map((product) => <tr key={product.id}>
                <td><strong>{product.product_name}</strong><small>{product.description || 'No description'}</small></td>
                <td>{Number(product.price).toFixed(2)}</td><td>{product.quantity}</td>
                <td><div className="row-actions"><button onClick={() => edit(product)}>Edit</button><button className="danger" disabled={busy} onClick={() => remove(product)}>Delete</button></div></td>
              </tr>)}</tbody></table></div>
          )}
        </div>
      </section>
    </main>
  );
}
