import React, { useEffect, useState } from 'react';
import { request } from './api';

const blank = { product_name: '', description: '', price: '', quantity: '' };
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

function Icon({ name, size = 20 }) {
  const paths = {
    box: <><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z" /><path d="m3 7 9 5 9-5M12 12v9" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    refresh: <><path d="M20 11a8 8 0 1 0-2.1 6.4" /><path d="M20 4v7h-7" /></>,
    logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" /><path d="M14 7l5 5-5 5M19 12H9" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    edit: <><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4 10.5-10.5Z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" /></>,
    chart: <><path d="M4 20V10m8 10V4m8 16v-7" /><path d="M2 20h20" /></>,
    alert: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('lab6-session') || 'null'); }
    catch { return null; }
  });
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadProducts(token = session?.access_token) {
    setLoadingProducts(true);
    try {
      const result = await request('/api/products', { token });
      setProducts(Array.isArray(result) ? result : result?.products || []);
    } finally { setLoadingProducts(false); }
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
      const data = await request('/api/login', { method: 'POST', body: JSON.stringify(credentials) });
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
        await request('/api/logout', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) });
      } catch { /* Local logout must still succeed. */ }
    }
    sessionStorage.removeItem('lab6-session');
    setSession(null); setProducts([]); setForm(blank); setEditingId(null);
    setNotice(''); setError(''); setQuery('');
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
    document.getElementById('product-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      setNotice(editingId ? 'Product updated successfully.' : 'Product added successfully.');
      setForm(blank); setEditingId(null);
      await loadProducts();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function remove(product) {
    if (!window.confirm(`Delete “${product.product_name}”?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/api/products/${product.id}`, { token: session.access_token, method: 'DELETE' });
      if (editingId === product.id) { setEditingId(null); setForm(blank); }
      setNotice('Product deleted successfully.');
      await loadProducts();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const searchText = query.trim().toLowerCase();
  const visibleProducts = products.filter((product) =>
    `${product.product_name} ${product.description || ''}`.toLowerCase().includes(searchText)
  );
  const stockUnits = products.reduce((sum, product) => sum + Number(product.quantity || 0), 0);
  const inventoryValue = products.reduce((sum, product) =>
    sum + Number(product.price || 0) * Number(product.quantity || 0), 0
  );
  const lowStock = products.filter((product) => Number(product.quantity) <= 5).length;

  if (!session) return (
    <main className="login-layout">
      <section className="login-story" aria-label="Product Manager introduction">
        <div className="brand brand-light"><span className="brand-mark"><Icon name="box" size={23} /></span><span>Product<span className="brand-accent">Manager</span></span></div>
        <div className="story-content">
          <span className="story-kicker"><span className="kicker-line" /> LABORATORY EXERCISE 06</span>
          <h1>Good products<br /><em>deserve</em> good<br />organization.</h1>
          <p>A simple, focused workspace to keep every item, price, and stock count in order.</p>
          <div className="story-art" aria-hidden="true">
            <span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" />
            <div className="art-tile tile-main"><span className="tile-symbol"><Icon name="box" size={33} /></span><span className="tile-lines"><i /><i /><i /></span></div>
            <div className="art-tile tile-small"><Icon name="chart" size={28} /></div>
            <span className="art-dot dot-one" /><span className="art-dot dot-two" />
          </div>
        </div>
        <div className="story-footer"><span className="footer-line" /> YOUR INVENTORY, AT A GLANCE</div>
      </section>
      <section className="login-entry">
        <div className="login-mobile-brand brand"><span className="brand-mark"><Icon name="box" size={22} /></span><span>Product<span className="brand-accent">Manager</span></span></div>
        <div className="login-card">
          <div className="welcome-icon"><Icon name="layers" size={27} /></div>
          <span className="section-kicker">WELCOME BACK</span>
          <h2>Sign in to your<br />workspace</h2>
          <p className="login-intro">Enter your account details to manage your products.</p>
          <form onSubmit={login}>
            <label htmlFor="login-username">Username</label>
            <input id="login-username" autoComplete="username" placeholder="Enter your username" required value={credentials.username} onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} />
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" placeholder="Enter your password" required value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} />
            {error && <p className="message error" role="alert">{error}</p>}
            <button className="primary login-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<Icon name="arrow" size={19} /></button>
          </form>
          <p className="login-note">A more organized catalog starts here.</p>
        </div>
        <span className="entry-footer">PRODUCT MANAGER · LAB EXERCISE 06</span>
      </section>
    </main>
  );

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <div className="brand brand-light"><span className="brand-mark"><Icon name="box" size={22} /></span><span>Product<span className="brand-accent">Manager</span></span></div>
        <div className="sidebar-body">
          <span className="sidebar-label">WORKSPACE</span>
          <div className="nav-item active"><Icon name="grid" size={19} /><span>Overview</span><span className="nav-dot" /></div>
          <div className="sidebar-note"><span className="note-icon"><Icon name="layers" size={19} /></span><strong>Stay on top of stock.</strong><p>Keep your catalog current as products change.</p></div>
        </div>
        <div className="sidebar-account"><span className="avatar">{(session.username || 'U').slice(0, 1).toUpperCase()}</span><div><strong>{session.username}</strong><small>Account</small></div><button aria-label="Log out" title="Log out" onClick={() => logout()}><Icon name="logout" size={19} /></button></div>
      </aside>
      <div className="main-area">
        <header className="dashboard-topbar"><div className="breadcrumb">Workspace <span>/</span> Overview</div><div className="topbar-right"><span className="topbar-badge"><span /> Catalog workspace</span><span className="topbar-avatar">{(session.username || 'U').slice(0, 1).toUpperCase()}</span></div></header>
        <div className="page-content">
          <div className="page-heading"><div><span className="section-kicker">INVENTORY DASHBOARD</span><h1>Your products<span className="heading-period">.</span></h1><p>A clear view of everything in your catalog.</p></div><button className="primary add-shortcut" onClick={() => { setEditingId(null); setForm(blank); document.getElementById('product-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.getElementById('product-name')?.focus(); }}><Icon name="plus" size={19} /> Add product</button></div>
          {error && <p className="message error" role="alert">{error}</p>}
          {notice && <p className="message success" role="status">{notice}</p>}
          <section className="stats-grid" aria-label="Inventory summary">
            <div className="stat-card"><span className="stat-icon teal"><Icon name="box" size={23} /></span><span className="stat-label">Total products</span><strong>{products.length}</strong><span className="stat-foot">Items in your catalog</span></div>
            <div className="stat-card"><span className="stat-icon amber"><Icon name="layers" size={23} /></span><span className="stat-label">Units in stock</span><strong>{stockUnits}</strong><span className="stat-foot">Across all products</span></div>
            <div className="stat-card"><span className="stat-icon blue"><Icon name="chart" size={23} /></span><span className="stat-label">Inventory value</span><strong className="stat-money">{money.format(inventoryValue)}</strong><span className="stat-foot">Price × quantity</span></div>
            <div className="stat-card"><span className="stat-icon rose"><Icon name="alert" size={23} /></span><span className="stat-label">Low or out of stock</span><strong>{lowStock}</strong><span className="stat-foot">5 units or fewer</span></div>
          </section>
          <section className="content-grid">
            <div className="panel inventory-panel">
              <div className="panel-heading"><div><span className="section-kicker">YOUR CATALOG</span><h2>Inventory <span className="count-pill">{products.length}</span></h2></div><span className="panel-caption">Manage your product details</span></div>
              <div className="list-toolbar"><div className="search-field"><Icon name="search" size={19} /><input aria-label="Search products" placeholder="Search products..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><button className="refresh-button" aria-label="Refresh products" title="Refresh products" disabled={loadingProducts} onClick={() => loadProducts().catch((err) => setError(err.message))}><Icon name="refresh" size={19} /></button></div>
              {loadingProducts && products.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="box" size={30} /></span><h3>Loading your products…</h3><p>Getting the latest catalog.</p></div> : products.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="box" size={30} /></span><h3>Your catalog is ready to grow</h3><p>Add your first product using the form.</p></div> : visibleProducts.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="search" size={29} /></span><h3>No matching products</h3><p>Try another name or description.</p></div> : (
                <div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>PRICE</th><th>STOCK</th><th className="actions-heading">ACTIONS</th></tr></thead><tbody>{visibleProducts.map((product) => {
                  const quantity = Number(product.quantity);
                  const level = quantity === 0 ? 'out' : quantity <= 5 ? 'low' : 'in';
                  return <tr key={product.id}><td><div className="product-cell"><span className="product-symbol">{(product.product_name || 'P').slice(0, 1).toUpperCase()}</span><div><strong>{product.product_name}</strong><small>{product.description || 'No description'}</small></div></div></td><td className="price-cell">{money.format(Number(product.price || 0))}</td><td><span className={`stock-tag ${level}`}><span />{quantity} {quantity === 1 ? 'unit' : 'units'}</span></td><td><div className="row-actions"><button title={`Edit ${product.product_name}`} onClick={() => edit(product)}><Icon name="edit" size={16} /> Edit</button><button className="delete-action" title={`Delete ${product.product_name}`} disabled={busy} onClick={() => remove(product)}><Icon name="trash" size={16} /> Delete</button></div></td></tr>;
                })}</tbody></table></div>
              )}
              <div className="list-footer">Showing {visibleProducts.length} of {products.length} {products.length === 1 ? 'product' : 'products'}{loadingProducts && products.length > 0 ? ' · Refreshing…' : ''}</div>
            </div>
            <div className="panel editor-panel" id="product-editor"><div className="editor-heading"><span className="editor-icon"><Icon name={editingId ? 'edit' : 'plus'} size={22} /></span><div><span className="section-kicker">{editingId ? 'UPDATE PRODUCT' : 'NEW PRODUCT'}</span><h2>{editingId ? 'Edit product' : 'Add a product'}</h2></div></div><p className="editor-intro">{editingId ? 'Make your changes below and save the updated item.' : 'Fill in the details to add an item to your catalog.'}</p>
              <form onSubmit={save}><label htmlFor="product-name">Product name <span>*</span></label><input id="product-name" required maxLength="100" placeholder="e.g. Wireless mouse" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
                <label htmlFor="product-description">Description <span>*</span></label><textarea id="product-description" rows="3" required placeholder="A short description of your product" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div className="two-columns"><div><label htmlFor="product-price">Price <span>*</span></label><div className="money-input"><span>₱</span><input id="product-price" type="number" min="0" max="99999999.99" step="0.01" required placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div></div><div><label htmlFor="product-quantity">Quantity <span>*</span></label><input id="product-quantity" type="number" min="0" step="1" required placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div></div>
                <button className="primary save-button" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}<Icon name="arrow" size={18} /></button>
                {editingId && <button type="button" className="cancel-button" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel editing</button>}
              </form><p className="editor-footnote">* Required fields</p></div>
          </section>
          <footer className="page-footer">Product Manager <span>·</span> Laboratory Exercise 06</footer>
        </div>
      </div>
    </main>
  );
}
