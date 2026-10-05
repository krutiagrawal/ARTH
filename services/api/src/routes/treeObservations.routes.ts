import { FastifyInstance } from 'fastify';
import { logCommunityObservationSchema } from '../schemas/treeObservations.schema';
import { saveHealthCheckPhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { logCommunityObservation } from '../services/treeObservation.service';
import { BadRequestError } from '../utils/errors';

// Any ARTH user physically near a tree submitting a geofenced observation (see
// plantingLocation.service.ts's assertCloseEnoughToObserve/assertObservationGpsAccuracy). Kept
// as its own route file/prefix — separate from trees.routes.ts's owner-scoped
// POST /:id/observations and plantedTrees.routes.ts's NGO-owner-scoped one — since this is the
// one path open to any authenticated user regardless of relationship to the tree.
export default async function treeObservationsRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    const { fields, file } = splitMultipartBody(request.body as any);
    const parsed = logCommunityObservationSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    // Fresh camera capture is required — a community observation with no photo is not
    // meaningful corroborating evidence (mirrors trees.schema.ts's planting-photo expectations).
    if (!file) throw new BadRequestError('A photo is required to log an observation.');
    const buffer = await file.toBuffer();
    const photoUrl = await saveHealthCheckPhoto({ filename: file.filename, mimetype: file.mimetype, buffer });

    const { targetKind, targetId, status, note, lat, lng, accuracy, mocked } = parsed.data;
    const observation = await logCommunityObservation(
      fastify.prisma,
      request.user!.id,
      targetKind === 'tree' ? { treeId: targetId } : { plantedTreeId: targetId },
      { status, note, photoUrl, point: { lat, lng }, accuracyMeters: accuracy, mocked },
    );
    reply.status(201).send(observation);
  });
}
