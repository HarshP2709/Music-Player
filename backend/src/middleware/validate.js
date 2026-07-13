/**
 * Validation middleware helpers
 */

/**
 * Validate that required body fields are present and non-empty strings.
 * @param {...string} fields
 */
export function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => {
      const v = req.body[f];
      return v === undefined || v === null || String(v).trim() === '';
    });
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    next();
  };
}

/**
 * Sanitize a string (strip HTML tags).
 * @param {string} str
 */
export function sanitize(str) {
  return String(str || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}
