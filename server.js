const app = require('./')
const port = process.env.PORT || 3000
app.listen(port)

console.log(require('./metadb-banner'))
console.log(`Listening on http://localhost:${port}`)
