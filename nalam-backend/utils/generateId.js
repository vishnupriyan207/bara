const mongoose = require('mongoose');

// Counter schema for atomic sequential IDs
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Atomically generates next sequential ID for given sequence name
 * @param {string} sequenceName - 'patient' or 'bill'
 * @param {string} prefix - 'PAT-' or 'INV-'
 * @param {number} startAt - 1 or 8001
 * @param {number} padLength - 6 (e.g. 000001) or 4 (e.g. 8001)
 */
const getNextSequence = async (sequenceName, prefix = '', startAt = 1, padLength = 6) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      sequenceName,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    let currentVal = counter.seq;
    if (currentVal < startAt) {
      const updated = await Counter.findByIdAndUpdate(
        sequenceName,
        { $set: { seq: startAt } },
        { new: true }
      );
      currentVal = updated.seq;
    }

    const paddedNumber = String(currentVal).padStart(padLength, '0');
    return `${prefix}${paddedNumber}`;
  } catch (error) {
    // Fallback if counter table is unreachable
    const fallbackRand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${Date.now().toString().slice(-4)}${fallbackRand}`;
  }
};

const generatePatientCode = async () => {
  return getNextSequence('patient', 'PAT-', 1, 6);
};

const generateBillNumber = async () => {
  return getNextSequence('bill', 'INV-', 8001, 4);
};

module.exports = {
  generatePatientCode,
  generateBillNumber,
  getNextSequence
};
