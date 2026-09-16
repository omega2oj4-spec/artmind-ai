import mongoose from 'mongoose';

const paintingSchema = new mongoose.Schema(
  {
    catalogId: { type: String, index: true, unique: true, sparse: true, trim: true },
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, default: 'Unknown Artist', trim: true },
    artistDetails: { type: String, default: '' },
    dateDisplay: { type: String, default: 'Undated' },
    dateStart: { type: Number, default: null },
    dateEnd: { type: Number, default: null },
    medium: { type: String, default: 'Oil on Canvas' },
    description: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    category: {
      type: String,
      required: true,
      enum: ['Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious'],
      default: 'Abstract'
    },
    style: { type: String, default: 'Impressionism' },
    colorMedium: { type: String, default: 'Oil' },
    surface: { type: String, default: 'Canvas' },
    popularity: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    aiSummary: { type: String, default: null },
    colorTheme: { type: String, default: 'Neutral' },
    tags: [{ type: String }],
    articId: { type: Number, index: true },
    sourceName: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    isPublicDomain: { type: Boolean, default: false },
    department: { type: String, default: '' },
    artworkType: { type: String, default: '' },
    classification: { type: String, default: '' },
    placeOfOrigin: { type: String, default: '' },
    dimensions: { type: String, default: '' },
    creditLine: { type: String, default: '' },
    lastSyncedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

paintingSchema.index({ title: 'text', artist: 'text', description: 'text', style: 'text', medium: 'text' });

export default mongoose.model('Painting', paintingSchema);
