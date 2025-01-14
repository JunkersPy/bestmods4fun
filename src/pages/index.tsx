import { type GetServerSidePropsContext, type NextPage } from "next";
import React from "react";

import { BestModsPage } from '../components/main';
import HeadInfo from "../components/Head";

import ModBrowser from '../components/modbrowser';

const Home: NextPage<{ cookies: { [key: string]: string } }> = ({ cookies }) => {
    return (
        <>
            <HeadInfo />
            <BestModsPage
                content={<ModBrowser />}
                cookies={cookies}
                showFilters={true}
            />
        </>
    );
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
    const cookies: { [key: string]: string | undefined; } = { ...ctx.req.cookies };

    return { props: { cookies: cookies } };
}

export default Home;
