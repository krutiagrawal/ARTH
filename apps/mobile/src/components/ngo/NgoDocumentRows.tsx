import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../common/AppText';
import { DocumentPickerField } from '../common/DocumentPickerField';
import { MultiPhotoPickerField } from '../social/MultiPhotoPickerField';
import { COLORS } from '../../constants/colors';
import { ApiError } from '../../api/client';
import type { ApiNgoDocument, NgoDocumentType } from '../../api/ngo';
import { useUploadNgoDocument, useDeleteNgoDocument } from '../../hooks/useApiQueries';

const fileNameOf = (url: string) => decodeURIComponent(url.split('/').pop() ?? 'document');

/**
 * One verification document (certificate / authorisation proof) on an NGO's edit screen: shows the
 * file uploaded at registration and replaces it on pick. Uploads immediately, like the logo, since
 * documents are saved through their own route rather than the profile PATCH.
 */
export function NgoDocumentRow({
  docType,
  label,
  documents,
  required,
  locked,
}: {
  docType: NgoDocumentType;
  label: string;
  documents: ApiNgoDocument[] | undefined;
  required?: boolean;
  /** Legal documents can't change once the account is approved. */
  locked?: boolean;
}) {
  const upload = useUploadNgoDocument();
  const [error, setError] = useState<string | null>(null);
  const existing = documents?.find((d) => d.docType === docType);

  return (
    <View>
      <DocumentPickerField
        label={label}
        required={required}
        doc={null}
        existingName={existing ? fileNameOf(existing.fileUrl) : null}
        disabled={locked || upload.isPending}
        hint={locked ? undefined : 'PDF or photo'}
        onChange={(file) => {
          if (!file) return;
          setError(null);
          upload.mutate(
            { docType, file },
            { onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not upload this document.') },
          );
        }}
      />
      {upload.isPending && <ActivityIndicator color={COLORS.sage} style={styles.spinner} />}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

/** The past-work photos submitted at registration: shown, removable, and more can be added (max 5). */
export function NgoPastWorkPhotos({ documents }: { documents: ApiNgoDocument[] | undefined }) {
  const upload = useUploadNgoDocument();
  const remove = useDeleteNgoDocument();
  const [error, setError] = useState<string | null>(null);
  const photos = (documents ?? []).filter((d) => d.docType === 'past_work_photo');
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');

  return (
    <View>
      <MultiPhotoPickerField
        photos={[]}
        existing={photos.map((d) => ({ id: d.id, url: d.fileUrl }))}
        onRemoveExisting={(id) => {
          setError(null);
          remove.mutate(id, { onError: fail });
        }}
        onChange={(picked) => {
          setError(null);
          // Each picked photo is uploaded right away (one request each, as the route takes one file).
          picked.forEach((file) => upload.mutate({ docType: 'past_work_photo', file }, { onError: fail }));
        }}
        max={5}
        mode="gallery"
        label="Past-work photos"
        hint="Photos of plantation work you have done. Up to 5."
      />
      {(upload.isPending || remove.isPending) && <ActivityIndicator color={COLORS.sage} style={styles.spinner} />}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 6 },
  error: { color: COLORS.dangerDark, fontSize: 12, marginTop: 4 },
});
