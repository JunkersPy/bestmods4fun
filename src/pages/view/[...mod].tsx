import { BestModsPage, SessionCtx } from '../../components/main';

import { type ModInstaller } from "@prisma/client";
import { type NextPage } from "next";
import React, { useContext, useState, useEffect } from "react";

import { trpc } from "../../utils/trpc";
import { type ModSource, type ModDownload } from '@prisma/client';

import { marked } from 'marked';

import HeadInfo from "../../components/Head";
import { ModInstallerRender, ModRatingRender } from '../../components/modbrowser';

import { prisma } from '../../server/db/client';
import { type GetServerSidePropsContext } from 'next';

const ModCtx = React.createContext<any | boolean | null>(null);
const ModViewCtx = React.createContext<string | null>(null);

const Home: NextPage<{ mod: any, modView: string }> = ({ mod, modView }) => {
    const cdn = (process.env.NEXT_PUBLIC_CDN_URL) ? process.env.NEXT_PUBLIC_CDN_URL : "";

    // Load category.
    const catQuery = trpc.category.getCategory.useQuery({
        id: mod?.category?.id ?? null,

        selUrl: true,
        selIcon: true,
        selHasBg: true,
        selName: true,

        incParent: true
    });
    const cat = catQuery.data;

    // Handle background.
    const [bgFile, setBgFile] = useState<string | null>(null);

    useEffect(() => {
        if (!cat)
            return;

        if (cat.hasBg && cat.parent != null)
            setBgFile(cat.parent.url + "_" + cat.url + ".png");
        else if (cat.hasBg && cat.parent == null)
            setBgFile(cat.url + ".png");
        else if (cat.parent != null && cat.parent.hasBg)
            setBgFile(cat.parent.url + ".png");
    }, [cat]);

    const bgPath = "/images/backgrounds/" + bgFile;

    // Determine title name.
    let titleName = mod.name;

    if (modView == "install")
        titleName += " (Installation)";
    else if (modView == "sources")
        titleName += " (Sources)";
    else if (modView == "downloads")
        titleName += " (Downloads)";

    return (
        <>
            <ModCtx.Provider value={mod}>
                <ModViewCtx.Provider value={modView}>
                    <HeadInfo
                        title={mod ? titleName + " - Best Mods" : null}
                        description={mod != null && mod !== false ? mod.descriptionShort : null}
                        image={mod && mod.banner != null ? cdn + mod.banner : null}
                        webtype="article"
                        author={(mod && mod.ownerName != null && mod.ownerName.length > 0) ? mod.ownerName : "Best Mods"}
                        excludeCdn={true}
                    />
                    {bgFile != null ? (
                        <BestModsPage
                            content={<MainContent 
                                cdn={cdn} 
                                cat={cat}
                            />}
                            image={cdn + bgPath}
                            excludeCdn={true}
                        />
                    ) : (
                        <BestModsPage
                            content={<MainContent 
                                cdn={cdn}
                                cat={cat}
                            />}
                        />
                    )}
                </ModViewCtx.Provider>
            </ModCtx.Provider>
        </>
    );
};

const MainContent: React.FC<{ cdn: string, cat: any }> = ({ cdn = "", cat }) => {
    const mod = useContext(ModCtx);
    const modView = useContext(ModViewCtx);
    const session = useContext(SessionCtx);

    // View generator.
    const [isViewed, setIsViewed] = useState(false);
    const modViewMut = trpc.modView.incModViewCnt.useMutation();

    useEffect(() => {
        if (!mod || isViewed || modView != "overview")
            return;

        modViewMut.mutate({
            url: mod.url
        });

        setIsViewed(true);
    }, [mod]);

    // Installer menu.
    const [installersMenuOpen, setInstallersMenuOpen] = useState(false);

    if (mod != null) {
        let body: JSX.Element = <></>;

        // Generate classes for buttons and such.
        const btnBaseClasses = "!font-sm text-white font-bold rounded-t p-1 md:p-3 mr-1";
        const defaultStyle = "bg-cyan-900/50";
        const activeStyle = "font-bold bg-cyan-500/50";

        // Decide what content to serve.
        if (modView == "install")
            body = <ModInstall />;
        else if (modView == "sources")
            body = <ModSources cdn={cdn} />;
        else if (modView == "downloads")
            body = <ModDownloads />;
        else
            body = <ModOverview />;

        // Generate image and link URLs.
        let banner = cdn + "/images/default_mod_banner.png";

        if (mod.banner != null)
            banner = cdn + mod.banner;

        const overviewLink = "/view/" + mod.url;
        const installLink = "/view/" + mod.url + "/install";
        const sourcesLink = "/view/" + mod.url + "/sources";
        const downloadsLink = "/view/" + mod.url + "/downloads";
        const editLink = "/admin/add/mod/" + mod.url;

        // Check rating.
        const onlyRating = ((mod.ModInstaller != null && mod.ModInstaller.length > 0) || (mod.ownerName != null && mod.ownerName.length > 0)) ? false : true;

        // Generate category icons and links.
        const defaultIcon = "/images/default_icon.png";
        const catIcon = (cat && cat.icon) ? cdn + cat.icon : cdn + defaultIcon;
        const catParIcon = (cat && cat.parent && cat.parent.icon) ? cdn + cat.parent.icon : cdn + defaultIcon;

        const catParLink = (cat && cat.parent) ? "/category/" + cat.parent.url : null;
        const catLink = ((cat) ? "/category" + ((cat.parent) ? "/" + cat.parent.url : "") + "/" + cat.url : null);

        return (
            <>
                <div className="container mx-auto w-full">
                    <div id="modHeader">
                        <div className="flex justify-center">
                            <img className="block rounded-t w-[48rem] h-[36rem]" src={banner} alt="Mod Banner" />
                        </div>
                        <h1 className="text-4xl font-bold text-white text-center">{mod.name}</h1>
                        <div className="flex justify-center items-center p-5">
                            {cat != null && (
                                <>
                                    {cat.parent != null ? (
                                        <>
                                            <a href={catParLink ?? "/category"} className="flex">
                                                <img src={catParIcon} className="w-6 h-6 rounded" alt="Category Icon" />
                                                <span className="ml-2 text-white">{cat.parent.name ?? "Category"}</span>
                                            </a>
                                            <span className="text-2xl text-white text-bold ml-2 mr-2"> → </span>
                                            <a href={catLink ?? "/category"} className="flex">
                                                <img src={catIcon} className="w-6 h-6 rounded" alt="Category Icon" />
                                                <span className="ml-2 text-white">{cat.name ?? "Category"}</span>
                                            </a>
                                        </>
                                    ) : (
                                        <>
                                            <a href={catLink ?? "/category"} className="flex">
                                                <img src={catIcon} className="w-6 h-6 rounded" alt="Category Icon" />
                                                <span className="ml-2 text-white">{cat.name ?? "Category"}</span>
                                            </a>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div id="modButtons" className="flex justify-center">
                        <a href={overviewLink} className={`${btnBaseClasses} ${modView == "overview" ? activeStyle : defaultStyle}`}>Overview</a>
                        <a href={installLink} className={`${btnBaseClasses} ${modView == "install" ? activeStyle : defaultStyle}`}>Installation</a>
                        <a href={sourcesLink} className={`${btnBaseClasses} ${modView == "sources" ? activeStyle : defaultStyle}`}>Sources</a>
                        <a href={downloadsLink} className={`${btnBaseClasses} ${modView == "downloads" ? activeStyle : defaultStyle}`}>Downloads</a>
                    </div>

                    <div className="p-12 w-full rounded-b bg-cyan-900/80">
                        <div className={`flex flex-wrap mb-4 ${onlyRating ? "justify-end" : "justify-between"}`}>
                            {mod.ownerName != null && mod.ownerName.length > 0 && (
                                <div className="">
                                    <p className="text-white">Maintained By <span className="font-bold">{mod.ownerName}</span></p>
                                </div>
                            )}
                            {mod.ModInstaller != null && mod.ModInstaller.length > 0 && (
                                <div className="relative">
                                    <div className="p-2 flex items-center bg-cyan-800 hover:bg-cyan-900 rounded-t">
                                        <button id="installerDropdownBtn" onClick={() => {
                                            setInstallersMenuOpen(!installersMenuOpen);
                                        }} className="text-white font-bold flex items-center mx-auto" type="button"><span>Install</span> {!installersMenuOpen ? (
                                            <svg className="w-4 h-4 text-center ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clipPath="url(#clip0_429_11251)"><path d="M7 10L12 15" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 15L17 10" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></g><defs><clipPath id="clip0_429_11251"><rect width="24" height="24" fill="white" /></clipPath></defs></svg>
                                        ) : (
                                            <svg className="w-4 h-4 text-center ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clipPath="url(#clip0_429_11224)"><path d="M17 14L12 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 9L7 14" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></g><defs><clipPath id="clip0_429_11224"><rect width="24" height="24" fill="white" /></clipPath></defs></svg>
                                        )}</button>
                                    </div>

                                    <ul id="installerDropdownMenu" className={`absolute py-2 text-sm bg-cyan-700 ${installersMenuOpen ? "block" : "hidden"}`} aria-labelledby="installerDropdownBtn">
                                        {mod.ModInstaller.map((ins: ModInstaller) => {
                                            return (
                                                <ModInstallerRender
                                                    key={mod.id + "-" + ins.sourceUrl}
                                                    modIns={ins}
                                                />
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                            <div className="relative flex justify-center">
                                <ModRatingRender
                                    mod={mod}
                                />
                            </div>
                        </div>
                        <div className="text-white" id="viewContent">
                            {body}
                        </div>
                        {session && (
                            <div className="flex flex-row justify-center items-center">
                                <a href={editLink} className="text-white bg-cyan-800 hover:bg-cyan-900 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded px-4 py-2 mt-2 max-w-xs">Edit</a>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )
    } else {
        return (
            <div className="container mx-auto">
                <h1 className="text-2xl font-bold mb-4 text-white text-center">Not Found</h1>
                <p className="text-white text-center">Mod not found. Please check the URL.</p>
            </div>
        );
    }
};

const ModOverview: React.FC = () => {
    const mod = useContext(ModCtx);
    const data = marked(mod?.description ?? "");

    return (
        <>
            <div dangerouslySetInnerHTML={{ __html: data }} />
        </>
    );
};

const ModInstall: React.FC = () => {
    const mod = useContext(ModCtx);
    const data = (mod.install != null) ? marked(mod.install ?? "") : "<p>No installation guide found.</p>";

    return (
        <>
            <div dangerouslySetInnerHTML={{ __html: data }} />
        </>
    );
};

const ModSources: React.FC<{ cdn?: string }> = ({ cdn }) => {
    const mod = useContext(ModCtx);

    return (
        <>
            <h3>Sources</h3>
            {mod.ModSource != null && mod.ModSource.length > 0 && (
                <div className="relative flex flex-wrap gap-6">

                    {mod.ModSource.map((src: ModSource) => {
                        const srcQuery = trpc.source.getSource.useQuery({
                            url: src.sourceUrl,

                            selName: true,
                            selBanner: true
                        });

                        const srcDirect = srcQuery.data;

                        let name = "Placeholder";
                        let banner = "/images/asdsad.png";

                        if (srcDirect) {
                            name = srcDirect.name;

                            if (srcDirect.banner)
                                banner = srcDirect.banner;
                        }

                        if (cdn)
                            banner = cdn + banner;

                        const srcLink = "https://" + src.sourceUrl + "/" + src.query;

                        return (
                            <a rel="noreferrer" key={"src-" + src.modId + "-" + src.sourceUrl + "-" + src.query} href={srcLink} className="relative !no-underline" target="_blank">
                                <div className="bg-cyan-500/50 hover:bg-cyan-600/50 rounded w-72 h-48">
                                    <div className="w-full h-36">
                                        <img src={banner} className="w-full h-full rounded-t" alt="Source Banner" />
                                    </div>
                                    <div className="w-full text-center">
                                        <h3 className="!text-lg font-bold">{name}</h3>
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}
        </>
    );
};

const ModDownloads: React.FC = () => {
    const mod = useContext(ModCtx);

    const modDownloadMut = trpc.modDownload.incModDownloadCnt.useMutation();

    const downloads = mod.ModDownload ?? [];

    const dlCnt: number = mod.totalDownloads ?? 0;

    return (
        <>
            <h3>Downloads</h3>
            <div className="relative flex flex-wrap gap-6">
                {downloads.map((dl: ModDownload) => {
                    return (
                        <a rel="noreferrer" key={mod.id + "-" + dl.url} onClick={() => {
                            modDownloadMut.mutate({
                                url: mod.url
                            });
                        }} className="bg-cyan-500/50 hover:bg-cyan-600/50 rounded p-4 max-w-lg !no-underline" href={dl.url} target="_blank">
                            <div key={dl.modId + dl.url} className="flex items-center">
                                <svg className="w-5 h-5" viewBox="0 0 512 512" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z" /></svg>
                                <span className="text-white font-lg ml-2">{dl.name}</span>
                            </div>
                        </a>
                    );
                })}
            </div>
            <p className="text-sm mt-4">{dlCnt.toString()} Total Downloads</p>
        </>
    );
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
    // We need to retrieve some props.
    if (!ctx.params || !ctx.params.mod)
        return { props: { mod: null, modView: "overview" } }

    const url = ctx.params.mod[0] ?? "";
    const modView = ctx.params.mod[1] ?? "overview";

    const mod = await prisma.mod.findFirst({
        include: {
            category: true,
            ModSource: true,
            ModDownload: true,
            ModInstaller: true
        },
        where: {
            url: url
        }
    });

    return { props: { mod: JSON.parse(JSON.stringify(mod, (_, v) => typeof v === 'bigint' ? v.toString() : v)), modView: modView } };
}

export default Home;
