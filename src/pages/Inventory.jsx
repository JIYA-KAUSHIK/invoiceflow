import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit2, Trash2, AlertTriangle, Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { motion } from 'framer-motion'
import { firestoreService } from '../services/firestoreService'
import { showError, showConfirm } from '../utils/alert'

const Inventory = ({ isStaff }) => {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const [formError, setFormError] = useState('')

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Simplified Form State
    const [formData, setFormData] = useState({
        name: '',
        category: 'General',
        unit: 'Pcs',
        gst: 5,
        purchasePrice: '',
        stock: '',
        minStock: '10'
    })

    useEffect(() => {
        const unsubscribe = firestoreService.subscribeProducts((data) => {
            setProducts(data)
            setLoading(false)
        })
        return () => unsubscribe()
    }, [])

    const filteredProducts = products.filter(p =>
        (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )

    const handleSave = async (e) => {
        e.preventDefault()
        setFormError('')

        try {
            if (editingProduct) {
                // Calculate only changed fields to prevent overwriting concurrent updates (like stock)
                const updates = {};
                if (formData.name !== editingProduct.name) updates.name = formData.name;
                if (formData.category !== editingProduct.category) updates.category = formData.category;
                if (formData.unit !== editingProduct.unit) updates.unit = formData.unit;

                // Compare numeric fields safely
                if (Number(formData.stock) !== Number(editingProduct.stock)) updates.stock = Number(formData.stock);
                if (Number(formData.purchasePrice) !== Number(editingProduct.purchasePrice)) updates.purchasePrice = Number(formData.purchasePrice);
                if (Number(formData.minStock) !== Number(editingProduct.minStock)) updates.minStock = Number(formData.minStock);
                if (Number(formData.gst) !== Number(editingProduct.gst)) updates.gst = Number(formData.gst);

                if (Object.keys(updates).length > 0) {
                    await firestoreService.updateProduct(editingProduct.id, updates);
                }
            } else {
                const productData = {
                    ...formData,
                    stock: Number(formData.stock),
                    purchasePrice: Number(formData.purchasePrice),
                    minStock: Number(formData.minStock),
                    gst: Number(formData.gst)
                }

                // Check for duplicate name
                if (products.some(p => p.name.toLowerCase() === formData.name.trim().toLowerCase())) {
                    setFormError("Product with this name already exists!");
                    return;
                }
                await firestoreService.addProduct(productData)
            }
            setIsModalOpen(false)
            resetForm()
        } catch (err) {
            setFormError("Error saving: " + err.message)
        }
    }

    const handleDelete = async (id) => {
        if (await showConfirm('Are you sure you want to delete this product?')) {
            try {
                await firestoreService.deleteProduct(id)
            } catch (err) {
                showError("Error deleting: " + err.message)
            }
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const inputs = document.querySelectorAll('.form-group input, .form-group select');
            const index = Array.prototype.indexOf.call(inputs, e.target);
            if (index > -1 && inputs[index + 1]) {
                inputs[index + 1].focus();
            }
        }
    }

    const resetForm = () => {
        setFormData({
            name: '', category: 'General', unit: 'Pcs',
            gst: 5, purchasePrice: '', stock: '', minStock: '10'
        })
        setEditingProduct(null)
        setFormError('')
    }

    const exportToExcel = () => {
        const exportData = products.map(p => {
            const { purchasePrice, ...rest } = p;
            return isStaff ? rest : p;
        });
        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Inventory")
        XLSX.writeFile(wb, "InvoiceFlow_Inventory.xlsx")
    }

    return (
        <div className="inventory">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        id="inventory-search"
                        type="text"
                        placeholder="Search products..."
                        style={{ paddingLeft: '40px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
                    <button onClick={exportToExcel} style={{ flex: 1, background: 'white', border: '1px solid var(--border)', fontWeight: 600, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Download size={18} /> Export
                    </button>
                    <button onClick={() => { resetForm(); setIsModalOpen(true); }} style={{ flex: 1, background: 'var(--primary)', color: 'white', fontWeight: 600, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Plus size={18} /> Add Product
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                                <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 600 }}>Product Name</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 600 }}>Category</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 600 }}>Stock</th>
                                {!isStaff && <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 600 }}>Purchase Price</th>}
                                <th style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p) => {
                                const isLowStock = Number(p.stock) <= Number(p.minStock)
                                return (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row">
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {p.id?.slice(-6)}</div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ fontSize: '12px', background: 'var(--accent)', color: 'var(--primary-dark)', padding: '4px 8px', borderRadius: '4px', fontWeight: 500 }}>{p.category}</span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ color: isLowStock ? 'var(--danger)' : 'inherit', fontWeight: isLowStock ? 700 : 500 }}>
                                                {p.stock} {p.unit}
                                            </div>
                                            {isLowStock && <div style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 600 }}>Low Stock Alert</div>}
                                        </td>
                                        {!isStaff && (
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ fontWeight: 600 }}>₹{p.purchasePrice}</div>
                                            </td>
                                        )}
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => { setEditingProduct(p); setFormData(p); setIsModalOpen(true); }} style={{ padding: '8px', background: '#eff6ff', color: '#3b82f6', borderRadius: '6px' }} title="Edit"><Edit2 size={16} /></button>
                                                {!isStaff && <button onClick={() => handleDelete(p.id)} style={{ padding: '8px', background: '#fef2f2', color: 'var(--danger)', borderRadius: '6px' }} title="Delete"><Trash2 size={16} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card" style={{ width: '95%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '20px' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: '#f1f5f9', padding: '6px', borderRadius: '50%' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                <div className="form-group" style={{ position: 'relative' }}>
                                    <label>Product Name</label>
                                    <input
                                        autoFocus
                                        required
                                        value={formData.name}
                                        onChange={e => { setFormData({ ...formData, name: e.target.value }); setFormError('') }}
                                        onKeyDown={handleKeyDown}
                                        type="text"
                                        placeholder="e.g. Wireless Mouse"
                                        autoComplete="off"
                                    />
                                    {!editingProduct && formData.name.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginTop: '4px' }}>
                                            {products.filter(p => p.name.toLowerCase().includes(formData.name.toLowerCase()) && p.name.toLowerCase() !== formData.name.trim().toLowerCase()).map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        setEditingProduct(p);
                                                        setFormData(p);
                                                        setFormError('');
                                                    }}
                                                    style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                >
                                                    <span style={{ fontWeight: 500, color: '#334155' }}>{p.name}</span>
                                                    <span style={{ fontSize: '10px', background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Edit</span>
                                                </div>
                                            ))}
                                            {products.some(p => p.name.toLowerCase() === formData.name.trim().toLowerCase()) && (
                                                <div style={{ padding: '10px 12px', color: '#ef4444', fontWeight: 600, background: '#fef2f2', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <AlertTriangle size={14} /> Product already exists
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} onKeyDown={handleKeyDown}>
                                            <option>General</option>
                                            <option>Electronics</option>
                                            <option>Stationery</option>
                                            <option>Grocery</option>
                                            <option>Hardware</option>
                                            <option>Clothing</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Unit</label>
                                        <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} onKeyDown={handleKeyDown}>
                                            <option>Pcs</option>
                                            <option>Kg</option>
                                            <option>Packet</option>
                                            <option>Box</option>
                                            <option>Dozen</option>
                                            <option>Litre</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>GST %</label>
                                        <select value={formData.gst} onChange={e => setFormData({ ...formData, gst: parseInt(e.target.value) })} onKeyDown={handleKeyDown}>
                                            <option value="5">5%</option>
                                            <option value="12">12%</option>
                                            <option value="18">18%</option>
                                        </select>
                                    </div>
                                    {!isStaff && (
                                        <div className="form-group">
                                            <label>Purchase Price (₹)</label>
                                            <input required value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })} onKeyDown={handleKeyDown} type="number" />
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>Current Stock</label>
                                        <input required value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} onKeyDown={handleKeyDown} type="number" />
                                    </div>
                                    <div className="form-group">
                                        <label>Min Stock Alert</label>
                                        <input required value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: e.target.value })} onKeyDown={handleKeyDown} type="number" />
                                    </div>
                                </div>
                            </div>
                            {formError && (
                                <div style={{ marginTop: '16px', padding: '10px', background: '#fef2f2', color: '#ef4444', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
                                    {formError}
                                </div>
                            )}
                            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid var(--border)' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', fontWeight: 600 }}>{editingProduct ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

export default Inventory
