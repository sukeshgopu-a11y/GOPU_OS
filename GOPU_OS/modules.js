export const gopuOsModules = {
  founder: {
    title: 'Founder Dashboard',
    editableIn: 'src/main.jsx'
  },
  cto: {
    title: 'CTO Command',
    labels: 'GOPU_OS/cto/labels.js',
    services: ['src/services/ctoService.js', 'src/services/integrationService.js']
  },
  cmo: {
    title: 'CMO Command',
    services: ['src/services/cmoService.js']
  },
  cfo: {
    title: 'CFO Command',
    services: ['src/services/cfoService.js']
  },
  coo: {
    title: 'COO Command',
    services: ['src/services/cooService.js', 'src/services/taskService.js']
  },
  director: {
    title: 'Director Command',
    services: ['src/services/directorService.js', 'src/services/approvalService.js']
  },
  shipments: {
    title: 'Shipment Tracker',
    services: ['src/services/shipmentService.js']
  },
  company: {
    title: 'Company Master Data',
    services: ['src/services/companyService.js']
  },
  security: {
    title: 'Security',
    services: ['src/services/securityService.js']
  }
};
