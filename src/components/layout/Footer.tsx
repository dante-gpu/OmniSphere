import React from 'react';
import { Github, Twitter, Disc as Discord } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-neutral-50 border-t border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-primary mb-4">OmniSphere</h3>
            <p className="text-neutral-500 mb-4">
              Cross-chain liquidity protocol enabling atomic liquidity composition between Sui and Solana.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-neutral-500 hover:text-primary">
                <Twitter size={24} />
              </a>
              <a href="#" className="text-neutral-500 hover:text-primary">
                <Discord size={24} />
              </a>
              <a href="#" className="text-neutral-500 hover:text-primary">
                <Github size={24} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-neutral-900 mb-4">Protocol</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-neutral-500 hover:text-primary">Documentation</a>
              </li>
              <li>
                <a href="#" className="text-neutral-500 hover:text-primary">Whitepaper</a>
              </li>
              <li>
                <a href="#" className="text-neutral-500 hover:text-primary">Security</a>
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
        
        <div className="mt-8 pt-8 border-t border-neutral-200">
          <p className="text-neutral-500 text-sm text-center">
            © {new Date().getFullYear()} OmniSphere Protocol. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;