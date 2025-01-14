import { z } from "zod";
import { router, publicProcedure, protectedProcedure, contributorProcedure } from "../trpc";

import fs from 'fs';
import FileType from '../../../utils/base64';
import { TRPCError } from "@trpc/server"

export const modRouter = router({
    getMod: publicProcedure
        .input(z.object({
            url: z.string().nullable(),
            visible: z.boolean().nullable(),

            selId: z.boolean().default(false),
            selUrl: z.boolean().default(false),
            selOwnerName: z.boolean().default(false),
            selName: z.boolean().default(false),
            selDescription: z.boolean().default(false),
            selDescriptionShort: z.boolean().default(false),
            selInstall: z.boolean().default(false),

            selBanner: z.boolean().default(false),

            selCreateAt: z.boolean().default(false),
            selUpdateAt: z.boolean().default(false),
            selNeedsRecounting: z.boolean().default(false),

            selTotalDownloads: z.boolean().default(false),
            selTotalViews: z.boolean().default(false),
            selTotalRating: z.boolean().default(false),

            selRatingHour: z.boolean().default(false),
            selRatingDay: z.boolean().default(false),
            selRatingWeek: z.boolean().default(false),
            selRatingMonth: z.boolean().default(false),
            selRatingYear: z.boolean().default(false),

            incOwner: z.boolean().default(false),
            incCategory: z.boolean().default(false),
            incSources: z.boolean().default(false),
            incDownloads: z.boolean().default(false),
            incScreenshots: z.boolean().default(false),
            incRatings: z.boolean().default(false),
            incUniqueViews: z.boolean().default(false),
            incCollections: z.boolean().default(false),
            incComments: z.boolean().default(false),
            incInstallers: z.boolean().default(false)

        }))
        .query(({ ctx, input }) => {
            if (!input.url || input.url.length < 1)
                return null;

            return ctx.prisma.mod.findFirst({
                where: {
                    url: input.url,
                    ...(input.visible != null && {
                        visible: input.visible
                    })
                },
                select: {
                    id: input.selId,
                    url: input.selUrl,
                    ownerName: input.selOwnerName,
                    name: input.selName,
                    description: input.selDescription,
                    descriptionShort: input.selDescriptionShort,
                    install: input.selInstall,

                    banner: input.selBanner,

                    updateAt: input.selUpdateAt,
                    createAt: input.selCreateAt,
                    needsRecounting: input.selNeedsRecounting,

                    totalDownloads: input.selTotalDownloads,
                    totalViews: input.selTotalViews,
                    totalRating: input.selTotalRating,

                    ratingHour: input.selRatingHour,
                    ratingDay: input.selRatingDay,
                    ratingWeek: input.selRatingWeek,
                    ratingMonth: input.selRatingMonth,
                    ratingYear: input.selRatingYear,

                    owner: input.incOwner,
                    ownerId: input.incOwner,

                    category: input.incCategory,
                    categoryId: input.incCategory,

                    ModSource: input.incSources,
                    ModDownload: input.incDownloads,
                    ModScreenshot: input.incScreenshots,
                    ModRating: input.incRatings,
                    ModUniqueView: input.incUniqueViews,
                    ModCollections: input.incCollections,
                    ModComment: input.incComments,
                    ModInstaller: input.incInstallers
                }
            });
        }),
    addMod: contributorProcedure
        .input(z.object({
            id: z.number(),

            ownerName: z.string().nullable(),

            name: z.string(),
            banner: z.string().nullable(),
            url: z.string(),
            category: z.number(),

            // The following should be parsed via Markdown Syntax.
            description: z.string(),
            descriptionShort: z.string(),
            install: z.string().nullable(),

            // The following should be parsed via JSON.
            downloads: z.string().nullable(),
            screenshots: z.string().nullable(),
            sources: z.string().nullable(),
            installers: z.string().nullable(),

            bremove: z.boolean().nullable()
        }))
        .mutation(async ({ ctx, input }) => {
            // First, we want to insert the mod into the database.
            let mod: any | null = null;

            // Make sure we have text in required fields.
            if (input.url.length < 1 || input.name.length < 1 || input.description.length < 1) {
                let err = "URL is empty.";

                if (input.name.length < 1)
                    err = "Name is empty.";

                if (input.description.length < 1)
                    err = "Description is empty.";

                console.error(err);

                throw new TRPCError({
                    code: "CONFLICT",
                    message: err
                });
            }

            // Let's now handle file uploads.
            let bannerPath: string | boolean | null = false;

            if (input.bremove)
                bannerPath = null;

            if (input.banner != null && input.banner.length > 0 && !input.bremove) {
                const base64Data = input.banner.split(',')[1];

                if (base64Data != null) {
                    // Retrieve file type.
                    const fileExt = FileType(base64Data);

                    // Make sure we don't have an-++ unknown file type.
                    if (fileExt != "unknown") {
                        // Now let's compile our file name.
                        const fileName = input.url + "." + fileExt;

                        // Set icon path.
                        bannerPath = "/images/mod/" + fileName;

                        // Convert to binary from base64.
                        const buffer = Buffer.from(base64Data, 'base64');

                        // Write file to disk.
                        try {
                            fs.writeFileSync(process.env.UPLOADS_DIR + "/" + bannerPath, buffer);
                        } catch (error) {
                            console.error("Error writing banner to disk.");
                            console.error(error);

                            throw new TRPCError({
                                code: "PARSE_ERROR",
                                message: (typeof error == "string") ? error : ""
                            });
                        }
                    } else {
                        console.error("Banner's file extension is unknown.");

                        throw new TRPCError({
                            code: "PARSE_ERROR",
                            message: "Unknown file extension for banner."
                        });
                    }
                } else {
                    console.error("Parsing base64 data is null.");

                    throw new TRPCError({
                        code: "PARSE_ERROR",
                        message: "Unable to process banner's Base64 data."
                    });
                }
            }

            try {
                mod = await ctx.prisma.mod.upsert({
                    where: {
                        id: input.id
                    },
                    update: {
                        ...(input.ownerName != null && input.ownerName.length > 0 && {
                            ownerName: input.ownerName
                        }),

                        name: input.name,
                        url: input.url,
                        categoryId: input.category,

                        description: input.description,
                        descriptionShort: input.descriptionShort,
                        install: input.install,

                        ...(bannerPath !== false && {
                            banner: bannerPath
                        })
                    },
                    create: {
                        ...(input.ownerName != null && input.ownerName.length > 0 && {
                            ownerName: input.ownerName
                        }),

                        name: input.name,
                        url: input.url,
                        categoryId: input.category,

                        description: input.description,
                        descriptionShort: input.descriptionShort,
                        install: input.install,

                        ...(bannerPath !== false && {
                            banner: bannerPath
                        })
                    }
                });
            } catch (error) {
                console.error("Error creating or updating mod.");
                console.error(error);

                throw new TRPCError({
                    code: "CONFLICT",
                    message: (typeof error == "string") ? error : ""
                });
            }

            if (mod != null) {
                // For now, we want to clear out all relation data to our mod before re-updating with how our form and React setup works.
                try {
                    await ctx.prisma.modDownload.deleteMany({
                        where: {
                            modId: mod.id
                        }
                    });

                    await ctx.prisma.modScreenshot.deleteMany({
                        where: {
                            modId: mod.id
                        }
                    });

                    await ctx.prisma.modSource.deleteMany({
                        where: {
                            modId: mod.id
                        }
                    });

                    await ctx.prisma.modInstaller.deleteMany({
                        where: {
                            modId: mod.id
                        }
                    });
                } catch (error) {
                    // Log, but keep continuing.
                    console.error("Error deleting relations for Mod ID #" + mod.id);
                }

                // Handle downloads relation.
                const downloads = JSON.parse(input.downloads ?? "[]");

                // Loop through downloads.
                downloads.forEach(async ({ name, url }: { name: string, url: string }) => {
                    if (url.length < 1)
                        return;

                    await ctx.prisma.modDownload.upsert({
                        where: {
                            modId_url: {
                                modId: mod.id,
                                url: url
                            }
                        },
                        create: {
                            modId: mod.id,
                            name: name,
                            url: url
                        },
                        update: {
                            name: name,
                            url: url
                        }
                    });
                });

                // Handle screenshots relation.
                const screenshots = JSON.parse(input.screenshots ?? "[]");

                // Loop through screenshots.
                screenshots.forEach(async ({ url }: { url: string }) => {
                    if (url.length < 1)
                        return

                    await ctx.prisma.modScreenshot.upsert({
                        where: {
                            modId_url: {
                                modId: mod.id,
                                url: url
                            }
                        },
                        create: {
                            modId: mod.id,
                            url: url
                        },
                        update: {
                            url: url
                        }
                    });
                });

                // Handle sources relation.
                const sources = JSON.parse(input.sources ?? "[]");

                // Loop through sources.
                sources.forEach(async ({ url, query }: { url: string, query: string }) => {
                    if (url.length < 1 || query.length < 1)
                        return;

                    await ctx.prisma.modSource.upsert({
                        where: {
                            modId_sourceUrl: {
                                modId: mod.id,
                                sourceUrl: url
                            }
                        },
                        create: {
                            modId: mod.id,
                            sourceUrl: url,
                            query: query,
                        },
                        update: {
                            query: query
                        }
                    });
                });

                // Handle installers relation.
                const installers = JSON.parse(input.installers ?? "[]");

                // Loop through installers.
                installers.forEach(async ({ srcUrl, url }: { srcUrl: string, url: string }) => {
                    if (srcUrl.length < 1 || url.length < 1)
                        return;

                    await ctx.prisma.modInstaller.upsert({
                        where: {
                            modId_sourceUrl: {
                                modId: mod.id,
                                sourceUrl: srcUrl
                            }
                        },
                        create: {
                            modId: mod.id,
                            sourceUrl: srcUrl,
                            url: url
                        },
                        update: {
                            url: url
                        }
                    });
                });
            }
        }),
    getAllModsBrowser: publicProcedure
        .input(z.object({
            cursor: z.number().nullish(),
            count: z.number().nullable(),

            categories: z.string().nullable(),
            search: z.string().nullable(),
            timeframe: z.number().nullable(),
            sort: z.number().nullable(),

            visible: z.boolean().nullable(),

            selId: z.boolean().default(false),
            selUrl: z.boolean().default(false),
            selOwnerName: z.boolean().default(false),
            selName: z.boolean().default(false),
            selDescription: z.boolean().default(false),
            selDescriptionShort: z.boolean().default(false),
            selInstall: z.boolean().default(false),

            selBanner: z.boolean().default(false),

            selCreateAt: z.boolean().default(false),
            selUpdateAt: z.boolean().default(false),
            selNeedsRecounting: z.boolean().default(false),

            selTotalDownloads: z.boolean().default(false),
            selTotalViews: z.boolean().default(false),
            selTotalRating: z.boolean().default(false),

            selRatingHour: z.boolean().default(false),
            selRatingDay: z.boolean().default(false),
            selRatingWeek: z.boolean().default(false),
            selRatingMonth: z.boolean().default(false),
            selRatingYear: z.boolean().default(false),

            incOwner: z.boolean().default(false),
            incCategory: z.boolean().default(false),
            incSources: z.boolean().default(false),
            incDownloads: z.boolean().default(false),
            incScreenshots: z.boolean().default(false),
            incRatings: z.boolean().default(false),
            incUniqueViews: z.boolean().default(false),
            incCollections: z.boolean().default(false),
            incComments: z.boolean().default(false),
            incInstallers: z.boolean().default(false)
        }))
        .query(async ({ ctx, input }) => {
            const count = (typeof input.count === 'number' && !isNaN(input.count)) ? input.count : 10;

            // Process categories.
            const catsArr = JSON.parse(input.categories ?? "[]");

            const items = await ctx.prisma.mod.findMany({
                where: {
                    ...(catsArr && catsArr.length > 0 && { categoryId: { in: catsArr } }),
                    ...(input.visible != null && { visible: input.visible }),
                    ...(input.search && {
                        OR: [
                            {
                                name: {
                                    contains: input.search,
                                    mode: "insensitive"
                                }
                            },
                            {
                                descriptionShort: {
                                    contains: input.search,
                                    mode: "insensitive"
                                }
                            },
                            {
                                ownerName: {
                                    contains: input.search,
                                    mode: "insensitive"
                                }
                            },
                            {
                                category: {
                                    name: {
                                        contains: input.search,
                                        mode: "insensitive"
                                    },
                                    nameShort: {
                                        contains: input.search,
                                        mode: "insensitive"
                                    }
                                }
                            }
                        ]
                    })
                },
                select: {
                    id: input.selId,
                    url: input.selUrl,
                    ownerName: input.selOwnerName,
                    name: input.selName,
                    description: input.selDescription,
                    descriptionShort: input.selDescriptionShort,
                    install: input.selInstall,

                    banner: input.selBanner,

                    updateAt: input.selUpdateAt,
                    createAt: input.selCreateAt,
                    needsRecounting: input.selNeedsRecounting,

                    totalDownloads: input.selTotalDownloads,
                    totalViews: input.selTotalViews,
                    totalRating: input.selTotalRating,

                    ratingHour: input.selRatingHour,
                    ratingDay: input.selRatingDay,
                    ratingWeek: input.selRatingWeek,
                    ratingMonth: input.selRatingMonth,
                    ratingYear: input.selRatingYear,

                    owner: input.incOwner,
                    category: input.incCategory,

                    ModSource: input.incSources,
                    ModDownload: input.incDownloads,
                    ModScreenshot: input.incScreenshots,
                    ModRating: input.incRatings,
                    ModUniqueView: input.incUniqueViews,
                    ModCollections: input.incCollections,
                    ModComment: input.incComments,
                    ModInstaller: input.incInstallers
                },
                orderBy: [
                    {
                        ...(input.sort != null && input.sort == 0 && {
                            ...(input.timeframe == 0 && { ratingHour: "desc" }),
                            ...(input.timeframe == 1 && { ratingDay: "desc" }),
                            ...(input.timeframe == 2 && { ratingWeek: "desc" }),
                            ...(input.timeframe == 3 && { ratingMonth: "desc" }),
                            ...(input.timeframe == 4 && { ratingYear: "desc" }),
                            ...(input.timeframe == 5 && { totalRating: "desc" })
                        }),
                        ...(input.sort != null && input.sort > 0 && {
                            ...(input.sort == 1 && { totalViews: "desc" }),
                            ...(input.sort == 2 && { totalDownloads: "desc" }),
                            ...(input.sort == 3 && { updateAt: "desc" }),
                            ...(input.sort == 4 && { createAt: "desc" })
                        })
                    },
                    {
                        id: "desc"
                    }
                ],
                cursor: (input.cursor) ? { id: input.cursor } : undefined,
                take: count + 1
            });

            let nextCur: typeof input.cursor | undefined = undefined;

            if (items.length > count) {
                const nextItem = items.pop();
                nextCur = nextItem?.id;
            }

            return {
                items,
                nextCur
            };
        }),
    requireUpdate: protectedProcedure
        .input(z.object({
            id: z.number()
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.mod.update({
                where: {
                    id: input.id
                },
                data: {
                    needsRecounting: true
                }
            })
        })
});
