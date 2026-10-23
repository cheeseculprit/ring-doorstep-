/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: '/', destination: '/care', permanent: false }]
  },
}

module.exports = nextConfig
