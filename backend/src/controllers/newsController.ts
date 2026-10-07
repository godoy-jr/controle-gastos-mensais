import type { Request, Response } from "express";
import { z } from "zod";
import { NEWS_CATEGORIES, getNews } from "../services/newsService.js";

const querySchema = z.object({
    category: z.enum(NEWS_CATEGORIES).default("economy")
});

export async function getNewsFeed(request: Request, response: Response) {
    const { category } = querySchema.parse(request.query);
    response.setHeader("Cache-Control", "public, max-age=600");
    response.json(await getNews(category));
}
