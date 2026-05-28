export const demoTenantId = '11111111-1111-1111-1111-111111111111';

export const demoData = new Proxy({}, {
  get() {
    return [];
  }
});
