const Database = require('better-sqlite3');
const db = new Database('data/pricemap.db');
db.pragma('journal_mode = WAL');

function splitOffer(productId, store) {
  const offer = db.prepare('SELECT id, price FROM store_offers WHERE product_id = ? AND store = ?').get(productId, store);
  if (!offer) { console.log('No offer found for', productId, store); return; }

  db.prepare(`
    INSERT INTO products (external_id, name, name_normalized, size, category, image_url, source)
    SELECT 'wrong-merge-' || id || '-' || ?, name || ' [' || ? || ']', name_normalized, size, category, image_url, source
    FROM products WHERE id = ?
  `).run(Date.now(), store, productId);

  const newId = db.prepare('SELECT last_insert_rowid() as id').get().id;
  db.prepare('UPDATE store_offers SET product_id = ? WHERE id = ?').run(newId, offer.id);
  db.prepare('UPDATE price_history SET product_id = ? WHERE product_id = ? AND store = ?').run(newId, productId, store);
  console.log('Split ' + store + ' (price ' + offer.price + ') from product ' + productId + ' -> new id ' + newId);
}

// კრეკერი კროკო: 2 Nabiji 0.99 is discount price but ratio too high (6.6x)
splitOffer(534, '2 Nabiji');

// ტუალეტის ქაღალდი: 2 Nabiji 0.39 is "ობუხოვი" not "სელპაკი"
splitOffer(1424, '2 Nabiji');

// Verify
[534, 1424].forEach(id => {
  const offers = db.prepare('SELECT store, price FROM store_offers WHERE product_id = ? AND in_stock = 1').all(id);
  const p = db.prepare('SELECT name FROM products WHERE id = ?').get(id);
  console.log('\n' + id + ': ' + p.name);
  offers.forEach(o => console.log('  ' + o.store + ': ' + o.price));
});
