const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure directories exist
const ensureDirectories = () => {
  const directories = [
    path.join(__dirname, 'data'),
    path.join(__dirname, 'public', 'admin'),
    path.join(__dirname, 'uploads')
  ];
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
};
ensureDirectories();

// Helpers
const getEnquiries = () => {
  try {
    const filePath = path.join(__dirname, 'data', 'enquiries.json');
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('Error reading enquiries:', err);
    return [];
  }
};
const saveEnquiries = (data) => {
  fs.writeFileSync(path.join(__dirname, 'data', 'enquiries.json'), JSON.stringify(data, null, 2));
};

// Save base64 media
const saveBase64File = (base64Data, originalName) => {
  if (!base64Data) return null;
  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return null;
  const ext = matches[1].split('/')[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  fs.writeFileSync(path.join(__dirname, 'uploads', filename), buffer);
  return filename;
};

// API
app.get('/api/enquiries', (req, res) => {
  res.json(getEnquiries());
});

app.post('/api/enquiries', (req, res) => {
  try {
    const enquiries = getEnquiries();
    const fileName = saveBase64File(req.body.mediaBase64, req.body.mediaName);

    const newEnquiry = {
      id: Date.now().toString(),
      serviceType: req.body.serviceType,
      projectTitle: req.body.projectTitle,
      description: req.body.description,
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      budget: req.body.budget,
      file: fileName || null,
      timestamp: new Date().toISOString()
    };

    enquiries.push(newEnquiry);
    saveEnquiries(enquiries);

    res.status(201).json(newEnquiry);
  } catch (err) {
    console.error('Error creating enquiry:', err);
    res.status(500).json({ error: 'Failed to create enquiry' });
  }
});

app.delete('/api/enquiries/:id', (req, res) => {
  try {
    const enquiries = getEnquiries();
    const index = enquiries.findIndex(e => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Enquiry not found' });

    const fileToDelete = enquiries[index].file;
    if (fileToDelete) {
      const filePath = path.join(__dirname, 'uploads', fileToDelete);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    enquiries.splice(index, 1);
    saveEnquiries(enquiries);

    res.status(204).end();
  } catch (err) {
    console.error('Error deleting enquiry:', err);
    res.status(500).json({ error: 'Failed to delete enquiry' });
  }
});

// Pages
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/enquiry', (_, res) => res.sendFile(path.join(__dirname, 'public', 'enquiry.html')));
app.get('/admin/submission', (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'submission.html')));

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});