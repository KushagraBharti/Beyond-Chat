update storage.buckets
set allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'text/markdown',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
where id = 'artifacts';

update storage.buckets
set allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/markdown',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'user-uploads';
