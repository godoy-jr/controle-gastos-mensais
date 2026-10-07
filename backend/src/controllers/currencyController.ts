import type { Request, Response } from "express";
import { z } from "zod";
import { getCurrencyHistory, getCurrencyRates } from "../services/currencyService.js";

const ratesQuery = z.object({
    base: z.string().length(3).default("BRL"),
    symbols: z.string().default("USD,EUR,GBP,ARS")
});

const historyQuery = z.object({
    base: z.string().length(3).default("BRL"),
    quote: z.string().length(3).default("USD"),
    days: z.coerce.number().int().min(2).max(90).default(30)
});

export async function getRates(request: Request, response: Response) {
    const query = ratesQuery.parse(request.query);
    response.setHeader("Cache-Control", "public, max-age=60");
    response.json(await getCurrencyRates(query.base, query.symbols.split(",").filter(Boolean)));
}

export async function getHistory(request: Request, response: Response) {
    const query = historyQuery.parse(request.query);
    response.setHeader("Cache-Control", "public, max-age=60");
    response.json(await getCurrencyHistory(query.base, query.quote, query.days));
}
