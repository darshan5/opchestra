import { notFound, redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function PortalCustomPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { slug, pageSlug } = await params;

  const workspace = await prisma.workspace.findUnique({ where: { slug } });
  if (!workspace) redirect('/app');

  const page = await prisma.portalPage.findFirst({
    where: { workspaceId: workspace.id, slug: pageSlug, published: true },
  });

  if (!page) notFound();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{page.title}</h1>
      <div
        className="prose dark:prose-invert mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}
