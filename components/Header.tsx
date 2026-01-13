"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {usePathname} from "next/navigation";
import {cn} from "@/lib/utils";
import SearchModal from "@/components/SearchModal";

const Header = ({ trendingCoins }: HeaderProps) => {

     const pathname = usePathname();

    return (
        <header>
            <div className="main-container inner">
                <Link href="/">
                    <Image src="/assets/logo.svg" alt="logo" width={132} height={40} />
                </Link>

                <nav>
                    <Link href="/" className={cn('nav-link', { 'is-active': pathname === '/', 'is-home': true })}>Home</Link>

                    {/*<p>Search Model</p>*/}
                    <SearchModal initialTrendingCoins={trendingCoins} />

                    <Link href="/coins" className={cn('nav-link', { 'is-active': pathname === '/coins' })}>All Coins</Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;


