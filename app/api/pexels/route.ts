import { NextRequest, NextResponse } from 'next/server';

interface PexelsVideo {
  id: number;
  duration: number;
  image: string;
  video_files: { link: string; quality: string }[];
}

interface PexelsResponse {
  videos: PexelsVideo[];
}

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get('term');
  if (!term) return NextResponse.json({ error: 'No term provided' }, { status: 400 });

  const count = Math.min(parseInt(request.nextUrl.searchParams.get('count') ?? '5', 10), 10);

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(term)}&per_page=${count}`,
    { headers: { Authorization: process.env.PEXELS_API ?? '' } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: `Pexels error ${res.status}` }, { status: 502 });
  }

  const data = (await res.json()) as PexelsResponse;

  const videos = data.videos.map((v) => ({
    id: v.id,
    duration: v.duration,
    thumbnail: v.image,
    url: v.video_files.find((f) => f.quality === 'sd')?.link ?? v.video_files[0]?.link,
  }));

  return NextResponse.json({ videos });
}
