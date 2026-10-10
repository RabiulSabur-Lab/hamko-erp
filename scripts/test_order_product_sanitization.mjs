import { sanitizeFormulaInput, isFormulaInjection, resolveOrderProduct } from '../src/utils/productUtils.ts';

// Since this is node, let's create unit tests for our functions
console.log('--- Running Tests for Formula Sanitization & Orphaned Product Handling ---');

// Test 1: Formula sanitization
const formulaCases = [
  { input: '=SUM(1,2)', expected: 'SUM(1,2)' },
  { input: '  =SUM(1,2)  ', expected: 'SUM(1,2)' },
  { input: '+12345', expected: '12345' },
  { input: '-cmd|/C calc', expected: 'cmd|/C calc' },
  { input: '@formula', expected: 'formula' },
  { input: '=-+@test', expected: 'test' },
  { input: 'Normal Product - 100g', expected: 'Normal Product - 100g' },
  { input: 'SKU-001', expected: 'SKU-001' },
  { input: '', expected: '' },
  { input: null, expected: '' },
  { input: undefined, expected: '' },
];

let failedTests = 0;

for (const tc of formulaCases) {
  const actual = sanitizeFormulaInput(tc.input);
  if (actual !== tc.expected) {
    console.error(`FAIL: sanitizeFormulaInput("${tc.input}") expected "${tc.expected}", got "${actual}"`);
    failedTests++;
  } else {
    console.log(`PASS: sanitizeFormulaInput("${tc.input}") => "${actual}"`);
  }
}

// Test 2: Formula detection
console.log('isFormulaInjection("=SUM(1,2)") =>', isFormulaInjection('=SUM(1,2)'));
console.log('isFormulaInjection("Normal Product") =>', isFormulaInjection('Normal Product'));

// Test 3: Product resolution for deleted / orphaned products
const mockProducts = [
  { id: 'prod-1', name: 'Alsan Milk 500ml', sku_code: 'AL-500', is_active: true },
  { id: 'prod-2', name: 'Choco Delight 250g', sku_code: 'CD-250', is_active: true },
  { id: 'prod-3', name: '[Deleted Product]', sku_code: 'DEL-1', is_active: false },
];

// Existing active product
const res1 = resolveOrderProduct({ id: 'prod-1', name: 'Alsan Milk 500ml' }, 'prod-1', mockProducts);
console.log('Existing active product resolution:', res1);
if (!res1.exists || res1.name !== 'Alsan Milk 500ml' || res1.isDeleted) {
  console.error('FAIL: Expected active product to be valid');
  failedTests++;
}

// Deleted product (is_active: false)
const res2 = resolveOrderProduct({ id: 'prod-3', name: '[Deleted Product]' }, 'prod-3', mockProducts);
console.log('Deleted product resolution:', res2);
if (res2.exists || res2.name !== '[Deleted Product]' || !res2.isDeleted) {
  console.error('FAIL: Expected deleted product to return [Deleted Product]');
  failedTests++;
}

// Orphaned product (id not in mockProducts)
const res3 = resolveOrderProduct(null, 'non-existent-id', mockProducts);
console.log('Orphaned product resolution (no product):', res3);
if (res3.exists || res3.name !== '[Deleted Product]' || !res3.isDeleted) {
  console.error('FAIL: Expected orphaned product to return [Deleted Product]');
  failedTests++;
}

// Formula product name in order item
const res4 = resolveOrderProduct({ id: 'prod-unknown', name: '=SUM(1,2)' }, 'prod-unknown', mockProducts);
console.log('Formula product name resolution:', res4);
if (res4.exists || res4.name !== '[Deleted Product]' || !res4.isDeleted) {
  console.error('FAIL: Expected unknown formula product to fallback to [Deleted Product]');
  failedTests++;
}

if (failedTests === 0) {
  console.log('\nALL TESTS PASSED SUCCESSFULLY! (0 failures)');
} else {
  console.error(`\nTESTS COMPLETED WITH ${failedTests} FAILURE(S)`);
  process.exit(1);
}
