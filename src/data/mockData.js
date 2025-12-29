export const initializeData = () => {
    const products = localStorage.getItem('if_products');
    if (!products) {
        const defaultProducts = [
            { id: '1', name: 'Wireless Mouse', category: 'Electronics', brand: 'Logitech', batch: 'WM-001', mfgDate: '2024-01-01', expDate: '', unit: 'Pcs', hsn: '8471', gst: 18, purchasePrice: 450, sellingPrice: 650, stock: 50, minStock: 10 },
            { id: '2', name: 'A4 Paper Ream', category: 'Stationery', brand: 'JK Copier', batch: 'P-100', mfgDate: '2024-02-15', expDate: '', unit: 'Packet', hsn: '4802', gst: 12, purchasePrice: 180, sellingPrice: 240, stock: 100, minStock: 20 },
            { id: '3', name: 'USB-C Cable', category: 'Accessories', brand: 'Samsung', batch: 'CB-22', mfgDate: '2024-03-10', expDate: '', unit: 'Pcs', hsn: '8544', gst: 18, purchasePrice: 120, sellingPrice: 250, stock: 30, minStock: 5 },
            { id: '4', name: 'LED Bulb 9W', category: 'Electrical', brand: 'Philips', batch: 'L-99', mfgDate: '2024-01-20', expDate: '', unit: 'Pcs', hsn: '8539', gst: 12, purchasePrice: 85, sellingPrice: 120, stock: 200, minStock: 50 },
        ];
        localStorage.setItem('if_products', JSON.stringify(defaultProducts));
    }

    const customers = localStorage.getItem('if_customers');
    if (!customers) {
        const defaultCustomers = [
            { id: '1', name: 'Ramesh Kumar', phone: '9876543210', address: 'Sonipat, Haryana', gst: '' },
        ];
        localStorage.setItem('if_customers', JSON.stringify(defaultCustomers));
    }

    const invoices = localStorage.getItem('if_invoices');
    if (!invoices) {
        localStorage.setItem('if_invoices', JSON.stringify([]));
    }

    const purchases = localStorage.getItem('if_purchases');
    if (!purchases) {
        localStorage.setItem('if_purchases', JSON.stringify([]));
    }
};
