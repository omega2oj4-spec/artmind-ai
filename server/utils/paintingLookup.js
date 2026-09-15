import mongoose from 'mongoose';

export function isMongoId(value) {
  const id = String(value || '');
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

export function favoriteIdList(favorites = []) {
  return (favorites || []).map((id) => String(id));
}
