import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import { type Context } from "./context";

const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape }) {
        return shape;
    },
});

export const router = t.router;

/**
 * Unprotected procedure
 **/
export const publicProcedure = t.procedure;

/**
 * Reusable middleware to ensure
 * users are logged in
 */
const isAuthed = t.middleware(({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
        ctx: {
            // infers the `session` as non-nullable
            session: { ...ctx.session, user: ctx.session.user },
        },
    });
});

/**
 * Protected procedure
 **/
export const protectedProcedure = t.procedure.use(isAuthed);

const isContributor = t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user)
        throw new TRPCError({ code: "UNAUTHORIZED" });

    const lookUp = await ctx.prisma.permissions.findFirst({
        where: {
            userId: ctx.session.user.id,
            perm: "contributor"
        }
    });

    if (!lookUp)
        throw new TRPCError({ code: "UNAUTHORIZED" });

    return next({
        ctx: {
            session: { ...ctx.session, user: ctx.session.user },
        }
    })
})

export const contributorProcedure = t.procedure.use(isContributor);