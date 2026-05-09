import './globals.css'
export const metadata = {
  title: 'Refer UG',
  description: 'Earn by referring friends — MTN MoMo & Airtel Money',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  )
}
