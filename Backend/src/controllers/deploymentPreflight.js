import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';

export const checkDepositDeployment = async (req, res) => {
  let session;
  let phase = 'session';
  try {
    session = await mongoose.startSession();
    phase = 'transaction';
    await session.withTransaction(async () => {
      await Transaction.findOne({ _id: new mongoose.Types.ObjectId('000000000000000000000000') })
        .select('_id').session(session).lean();
    });
    phase = 'queueHistory';
    await Transaction.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId('000000000000000000000000') } },
      { $lookup: {
        from: Transaction.collection.name,
        let: { user: '$user', type: '$type', created: '$createdAt', id: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ['$user', '$$user'] },
            { $eq: ['$type', '$$type'] },
            { $or: [
              { $lt: ['$createdAt', '$$created'] },
              { $and: [{ $eq: ['$createdAt', '$$created'] }, { $lt: ['$_id', '$$id'] }] },
            ] },
          ] } } },
          { $group: { _id: null, earlierRequests: { $sum: 1 } } },
        ],
        as: 'history',
      } },
    ]);
    return res.status(200).json({ success: true, data: { transactions: true, queueHistory: true } });
  } catch (error) {
    console.error('Deposit deployment preflight failed:', error.name, error.code);
    return res.status(503).json({
      success: false,
      error: 'Deposit deployment preflight failed.',
      data: { phase, code: Number.isInteger(error.code) ? error.code : null },
    });
  } finally {
    if (session) await session.endSession();
  }
};
