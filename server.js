const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
// Serve static files from the project directory (index.html, app.js, records.json, etc.)
app.use(express.static(path.join(__dirname)));

app.post('/save-records', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'records.json');
    const data = JSON.stringify(req.body, null, 2) + '\n';
    await fs.writeFile(filePath, data, 'utf8');
    return res.sendStatus(200);
  } catch (err) {
    console.error('Failed to write records.json:', err);
    return res.status(500).json({ error: 'Failed to write records.json' });
  }
});

app.listen(PORT, () => {
  console.log(`Admission Tracker server listening: http://localhost:${PORT}`);
  console.log('Use Ctrl+C to stop.');
});
