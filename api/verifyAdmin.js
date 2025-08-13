export default function handler(req, res) {
  const { password } = req.body;

  const expected = "adminsumon7891";//process.env.ADMIN_CODE;

  if (!password || !expected) {
    return res.status(400).json({ success: false, message: 'Missing password or server config.' });
  }

  if (password === expected) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(403).json({ success: false, message: 'Invalid password.' });
  }
}
