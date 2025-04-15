import React from 'react';
import { Github, Twitter, Disc as Discord, MessageCircle } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand section with logo and social links */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.svg" alt="OmniSphere Logo" className="h-8 w-8" />
              <span className="font-bold text-xl">OmniSphere</span>
            </div>
            <p className="text-neutral-500 mb-4">
              Seamless cross-chain liquidity protocol for the decentralized future.
            </p>
            <div className="flex gap-4">
              <a href="https://twitter.com/omnisphere" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-primary">
                <Twitter size={20} />
              </a>
              <a href="https://discord.gg/omnisphere" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-primary">
                <MessageCircle size={20} />
              </a>
              <a href="https://github.com/omnisphere" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-primary">
                <Github size={20} />
              </a>
            </div>
          </div>
          
          {/* Navigation links organized by category */}
          <div>
            <h4 className="font-medium text-neutral-900 mb-4">Protocol</h4>
            <ul className="space-y-2">
              <li>
                <a href="/pools" className="text-neutral-500 hover:text-primary">Pools</a>
              </li>
              <li>
                <a href="/bridge" className="text-neutral-500 hover:text-primary">Bridge</a>
              </li>
              <li>
                <a href="/analytics" className="text-neutral-500 hover:text-primary">Analytics</a>
              </li>
              <li>
                <a href="/docs" className="text-neutral-500 hover:text-primary">Documentation</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-neutral-900 mb-4">Governance</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-neutral-500 hover:text-primary">DAO</a>
              </li>
              <li>
                <a href="#" className="text-neutral-500 hover:text-primary">Proposals</a>
              </li>
              <li>
                <a href="#" className="text-neutral-500 hover:text-primary">Voting</a>
              </li>
              <li>
                <a href="#" className="text-neutral-500 hover:text-primary">Treasury</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-neutral-900 mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-neutral-500 hover:text-primary">FAQ</a>
              </li>
              <li>
                <a href="#" className="text-neutral-500 hover:text-primary">Terms of Service</a>
              </li>
              <li>
                <a href="#" className="text-neutral-500 hover:text-primary">Privacy Policy</a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Copyright notice */}
        <div className="mt-8 pt-8 border-t border-neutral-200">
          <p className="text-neutral-500 text-sm text-center">
            © {new Date().getFullYear()} OmniSphere Protocol by Baturalp. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;