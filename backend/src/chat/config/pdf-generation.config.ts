
export const PDF_GENERATION_CONFIG = {
    page: {
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    },
  
    browser: {
      headless: true,
    },
  
    styles: {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12pt',
      lineHeight: 1.6,
      textColor: '#222222',
      headingColor: '#1F3A5F',
      tableHeaderColor: '#E8EEF5',
      tableBorderColor: '#888888',
    },
  };
  