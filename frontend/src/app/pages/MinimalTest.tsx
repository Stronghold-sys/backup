export default function MinimalTest() {
  console.info('🎯 MinimalTest component rendering...');
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fef3c7',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#dc2626',
          marginBottom: '16px'
        }}>
          🎉 SUCCESS!
        </h1>
        <p style={{
          fontSize: '24px',
          color: '#374151',
          marginBottom: '24px'
        }}>
          App is rendering correctly!
        </p>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <p style={{
            fontSize: '16px',
            color: '#6b7280'
          }}>
            If you can see this page, the application is working.
            Check the browser console for logs.
          </p>
        </div>
      </div>
    </div>
  );
}
